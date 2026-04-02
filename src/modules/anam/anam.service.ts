import { Types } from "mongoose";
import { AnamSessionModel } from "./anamSession.model";
import { ChatModel } from "../chat/chat.model";
import { UserModel } from "../user/user.model";
import { TrainerModel } from "../trainer/trainer.model";
import { WorkoutModel } from "../workoutGoal/workoutGoal.model";
import { callAI } from "../../services/ai.service";
import { findRelevantContent } from "../content/content.service";

const ANAM_API_URL = "https://api.anam.ai/v1";
const ANAM_API_KEY = process.env.ANAM_API_KEY || "";

// How many previous messages to inject (same as chat)
const CALL_HISTORY_WINDOW = 10;

// ─────────────────────────────────────────────────────────────
// TRAINER — SET ANAM PERSONA ID
// Called when trainer fills in their personaId via app form
// ─────────────────────────────────────────────────────────────

export const setTrainerPersonaId = async (
  trainerId: string,
  personaId: string,
) => {
  const trainer = await TrainerModel.findById(trainerId);
  if (!trainer) throw new Error("Trainer not found");

  trainer.anamAI = {
    personaId,
    isEnabled: true,
  };

  await trainer.save();
  return trainer;
};

// ─────────────────────────────────────────────────────────────
// TRAINER — REMOVE ANAM PERSONA
// ─────────────────────────────────────────────────────────────

export const removeTrainerPersona = async (trainerId: string) => {
  const trainer = await TrainerModel.findById(trainerId);
  if (!trainer) throw new Error("Trainer not found");

  trainer.anamAI = { personaId: "", isEnabled: false };
  await trainer.save();
  return trainer;
};

// ─────────────────────────────────────────────────────────────
// START ANAM SESSION
// 1. Verify trainer has Anam enabled
// 2. Create Anam session via API (get session token)
// 3. Save AnamSession to DB
// Returns: { sessionToken, anamSessionId, dbSessionId }
// ─────────────────────────────────────────────────────────────

export const startAnamSession = async (userId: string, trainerId: string) => {
  // 1. Load trainer and verify Anam is set up
  const trainer = await TrainerModel.findById(trainerId);
  console.log(trainer);
  if (!trainer) throw new Error("Trainer not found");
  if (!trainer.anamAI?.isEnabled || !trainer.anamAI?.personaId) {
    throw new Error("This trainer has not set up their Anam AI video call yet");
  }

  // 2. Check no active session already exists for this user+trainer
  const existingActive = await AnamSessionModel.findOne({
    userId,
    trainerId,
    status: "active",
  });
  if (existingActive) {
    throw new Error("You already have an active call session. End it first.");
  }

  // 3. Call Anam API to create a session
  let anamSessionId: string | undefined;
  let sessionToken: string | undefined;

  try {
    const response = await fetch(`${ANAM_API_URL}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANAM_API_KEY}`,
      },
      body: JSON.stringify({
        personaId: trainer.anamAI.personaId,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anam API error: ${response.status} — ${err}`);
    }

    const data = await response.json();
    anamSessionId = data.id || data.sessionId;
    sessionToken = data.sessionToken || data.token;
  } catch (err: any) {
    // If Anam API is not reachable (dev mode), continue without it
    console.warn("Anam API call failed (dev mode?):", err.message);
  }

  // 4. Save session to DB
  const dbSession = await AnamSessionModel.create({
    userId,
    trainerId,
    personaId: trainer.anamAI.personaId,
    anamSessionId,
    startedAt: new Date(),
    status: "active",
  });

  return {
    dbSessionId: (dbSession._id as Types.ObjectId).toString(),
    anamSessionId,
    sessionToken,
    personaId: trainer.anamAI.personaId,
    trainerName: trainer.name,
  };
};

// ─────────────────────────────────────────────────────────────
// SEND MESSAGE DURING ANAM CALL
// Same context logic as chat service BUT:
//   - messages saved with source: "anam_call"
//   - video suggestions are TITLE ONLY (no URL)
//   - response is the text Anam will speak aloud
// ─────────────────────────────────────────────────────────────

export const sendAnamMessage = async (
  userId: string,
  trainerId: string,
  dbSessionId: string,
  userMessage: string,
) => {
  // 1. Verify session is still active
  const session = await AnamSessionModel.findOne({
    _id: dbSessionId,
    userId,
    status: "active",
  });
  if (!session) throw new Error("No active call session found");

  // 2. Load user
  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");

  // 3. Load trainer
  const trainer = await TrainerModel.findById(trainerId);
  if (!trainer) throw new Error("Trainer not found");

  // 4. Get or create chat thread (same thread as text chat)
  const chatThread = await getOrCreateCallThread(userId, trainerId, trainer);

  // 5. Get user memory for this trainer
  const memory = user.getMemoryForTrainer(trainerId);

  // 6. Load last 3 completed workouts
  const recentWorkouts = await WorkoutModel.find({
    userId,
    status: "completed",
  })
    .sort({ completedAt: -1 })
    .limit(3)
    .select(
      "focusArea goal workout_intensity actualDurationMinutes completedAt aiPlan.checkInResponse",
    )
    .lean();

  // 7. Get last 10 messages from thread (text + call combined for full context)
  const last10 = chatThread.messages.slice(-CALL_HISTORY_WINDOW);
  const conversationHistory = last10.map((msg: any) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  // 8. Check if user is asking about video content
  let relevantContent: any[] = [];
  if (isVideoRequest(userMessage)) {
    const contentQuery = extractContentQuery(userMessage);
    relevantContent = await findRelevantContent(trainerId, {
      exerciseName: contentQuery.exerciseName,
      muscleGroups: contentQuery.muscleGroups,
      keywords: contentQuery.keywords,
      limit: 3,
    });
  }

  // 9. Build user context (same as chat)
  const userContext = buildUserContext(
    user,
    memory,
    recentWorkouts,
    relevantContent,
    true, // ← isAnamCall = true → title only, no URL
  );

  // 10. Build system prompt in trainer's voice
  const systemPrompt = buildAnamSystemPrompt(
    {
      name: trainer.name,
      specialty: trainer.specialty,
      systemPrompt: trainer.systemPrompt || "",
    },
    userContext,
  );

  // 11. Call AI — response is what Anam will speak
  const aiResponseText = await callAI({
    systemPrompt,
    userMessage,
    maxTokens: 600, // shorter for spoken responses
    conversationHistory,
  });

  // 12. Save user message with source: "anam_call"
  const userMsg = {
    role: "user",
    content: userMessage,
    status: "sent",
    source: "anam_call",
    createdAt: new Date(),
  };

  // 13. Save assistant message with source: "anam_call"
  const assistantMsg = {
    role: "assistant",
    content: aiResponseText,
    status: "sent",
    source: "anam_call",
    createdAt: new Date(),
  };

  // 14. Push both to chat thread
  chatThread.messages.push(userMsg as any);
  chatThread.messages.push(assistantMsg as any);
  chatThread.totalMessages = (chatThread.totalMessages || 0) + 2;
  chatThread.lastMessageAt = new Date();
  await chatThread.save();

  const saved = chatThread.messages.slice(-2);
  const savedUser = saved[0];
  const savedAssist = saved[1];

  return {
    userMessage: savedUser,
    assistantMessage: savedAssist,
    chatId: (chatThread._id as Types.ObjectId).toString(),
    // Title only for Anam — no URL (user will find it in content section)
    suggestedContentTitles: relevantContent.map((c: any) => c.title),
  };
};

// ─────────────────────────────────────────────────────────────
// END ANAM SESSION
// ─────────────────────────────────────────────────────────────

export const endAnamSession = async (userId: string, dbSessionId: string) => {
  const session = await AnamSessionModel.findOne({
    _id: dbSessionId,
    userId,
    status: "active",
  });
  if (!session) throw new Error("No active session found");

  const endedAt = new Date();
  const durationSeconds = Math.round(
    (endedAt.getTime() - session.startedAt.getTime()) / 1000,
  );

  session.status = "completed";
  session.endedAt = endedAt;
  session.durationSeconds = durationSeconds;
  await session.save();

  return {
    sessionId: (session._id as Types.ObjectId).toString(),
    durationSeconds,
    endedAt,
  };
};

// ─────────────────────────────────────────────────────────────
// GET CALL HISTORY
// Returns only anam_call messages from the chat thread
// ─────────────────────────────────────────────────────────────

export const getCallHistory = async (
  userId: string,
  trainerId: string,
  page = 1,
  limit = 20,
) => {
  const chatThread = await ChatModel.findOne({
    userId,
    trainerId,
    chatType: "trainer",
  });

  if (!chatThread) {
    return { messages: [], totalMessages: 0, hasMore: false };
  }

  // Filter only anam_call messages
  const callMessages = chatThread.messages.filter(
    (m: any) => m.source === "anam_call",
  );

  const total = callMessages.length;
  const startIndex = Math.max(0, total - page * limit);
  const endIndex = Math.max(0, total - (page - 1) * limit);
  const pageMsg = callMessages.slice(startIndex, endIndex).reverse();

  return {
    messages: pageMsg,
    totalMessages: total,
    hasMore: startIndex > 0,
  };
};

// ─────────────────────────────────────────────────────────────
// GET USER'S ANAM SESSION HISTORY
// ─────────────────────────────────────────────────────────────

export const getSessionHistory = async (
  userId: string,
  trainerId?: string,
  limit = 10,
) => {
  const query: any = { userId, status: "completed" };
  if (trainerId) query.trainerId = trainerId;

  return await AnamSessionModel.find(query)
    .populate("trainerId", "name specialty profileImage anamAI")
    .sort({ startedAt: -1 })
    .limit(limit)
    .lean();
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

// Get or create the trainer chat thread (same thread as text chat)
const getOrCreateCallThread = async (
  userId: string,
  trainerId: string,
  trainer: any,
) => {
  let thread = await ChatModel.findOne({
    userId,
    trainerId,
    chatType: "trainer",
  });

  if (!thread) {
    thread = await ChatModel.create({
      userId,
      trainerId,
      chatType: "trainer",
      trainerPersona: {
        name: trainer.name,
        specialty: trainer.specialty,
        systemPrompt: trainer.systemPrompt || "",
      },
      messages: [],
      totalMessages: 0,
      isActive: true,
    });
  }

  return thread;
};

// Video request detection (same as chat service)
const VIDEO_REQUEST_KEYWORDS = [
  "video",
  "show me",
  "watch",
  "tutorial",
  "how to",
  "form",
  "technique",
  "demonstration",
  "guide",
  "visual",
  "example",
  "doing",
  "performing",
  "exercise",
  "movement",
];

const isVideoRequest = (message: string): boolean =>
  VIDEO_REQUEST_KEYWORDS.some((kw) => message.toLowerCase().includes(kw));

const extractContentQuery = (message: string) => {
  const lower = message.toLowerCase();

  const exercises = [
    "bench press",
    "squat",
    "deadlift",
    "pull up",
    "pull-up",
    "chin up",
    "overhead press",
    "row",
    "barbell row",
    "dumbbell row",
    "lat pulldown",
    "push up",
    "push-up",
    "dip",
    "lunge",
    "leg press",
    "leg curl",
    "bicep curl",
    "tricep",
    "plank",
    "crunch",
    "hip hinge",
    "rdl",
    "romanian deadlift",
    "hip thrust",
    "glute bridge",
    "cable fly",
    "incline press",
    "decline press",
    "shoulder press",
    "lateral raise",
    "face pull",
    "ab wheel",
    "jab",
    "cross",
    "hook",
    "uppercut",
  ];

  const muscleGroupMap: Record<string, string> = {
    chest: "chest",
    pec: "chest",
    back: "back",
    lats: "back",
    shoulder: "shoulders",
    delt: "shoulders",
    arm: "arms",
    bicep: "arms",
    tricep: "arms",
    leg: "legs",
    quad: "legs",
    hamstring: "legs",
    glute: "glutes",
    butt: "glutes",
    core: "core",
    ab: "core",
    abs: "core",
    "upper body": "upper_body",
    "lower body": "lower_body",
    cardio: "cardio",
    boxing: "boxing",
  };

  const foundExercise = exercises.find((ex) => lower.includes(ex));
  const foundMuscles = Object.entries(muscleGroupMap)
    .filter(([key]) => lower.includes(key))
    .map(([, value]) => value);
  const keywords = lower
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5);

  return {
    exerciseName: foundExercise,
    muscleGroups: [...new Set(foundMuscles)] as any[],
    keywords,
  };
};

// Build system prompt for Anam call — trainer persona voice
// Same as chat but adds spoken response instructions
const buildAnamSystemPrompt = (
  persona: { name: string; specialty: string; systemPrompt: string },
  userContext: string,
): string =>
  `
${persona.systemPrompt}

═══════════════════════════════
USER CONTEXT:
${userContext}
═══════════════════════════════

You are ${persona.name} on a LIVE VIDEO CALL with your client.
Respond in your exact voice, tone, and coaching style.
Keep responses conversational and natural for spoken delivery — not too long.
If suggesting a video, mention the TITLE ONLY (do not include URLs — they will find it in the app).
Example: "You should check out my video called 'Perfect Bench Press Form Guide' in the app."
Never break character. Never mention you are an AI.
`.trim();

// Build user context — same as chat but isAnamCall changes video section
const buildUserContext = (
  user: any,
  memory: any,
  recentWorkouts: any[],
  relevantContent: any[] = [],
  isAnamCall = false,
): string => {
  const profile = `
PROFILE:
- Name: ${user.firstName} ${user.lastName}
- Goal: ${user.primaryGoal || "not set"}
- Fitness level: ${user.fitnessLevel || "unknown"}
- Height: ${user.height || "N/A"} cm | Weight: ${user.weight || "N/A"} kg
- Injuries: ${user.injuries?.join(", ") || "none"}
- Equipment: ${user.availableEquipment || "unknown"}
- Training days/week: ${user.trainingDaysPerWeek || "not set"}
`.trim();

  const memorySection = memory
    ? `
TRAINING MEMORY:
- Experience: ${memory.profileMemory?.experienceLevel || "unknown"}
- Equipment preference: ${memory.profileMemory?.equipment || "unknown"}
- Motivation style: ${memory.profileMemory?.motivationStyle || "balanced"}
- Limitations: ${memory.profileMemory?.limitations || "none"}
- Preferences: ${memory.profileMemory?.preferences || "none"}
- Active flags: ${memory.rollingMemory?.flags?.join(", ") || "none"}
`.trim()
    : "";

  const workoutsSection =
    recentWorkouts.length > 0
      ? `
RECENT WORKOUTS (last ${recentWorkouts.length}):
${recentWorkouts
  .map(
    (w: any, i: number) =>
      `${i + 1}. ${new Date(w.completedAt).toLocaleDateString()} | Focus: ${w.focusArea?.join(", ")} | Intensity: ${w.workout_intensity?.join(", ")} | Duration: ${w.actualDurationMinutes || "N/A"} min`,
  )
  .join("\n")}
`.trim()
      : "RECENT WORKOUTS: None yet.";

  // Anam call → title only, no URL
  // Text chat → title + URL (handled in chat.service.ts)
  const contentSection =
    relevantContent.length > 0
      ? `
RELEVANT VIDEOS FROM TRAINER'S LIBRARY:
${relevantContent
  .map(
    (c: any, i: number) =>
      `${i + 1}. "${c.title}" — ${c.description?.substring(0, 100)}...`,
  )
  .join("\n")}

${
  isAnamCall
    ? "If recommending a video, mention the TITLE ONLY. Tell user to find it in the app. Do NOT say any URLs."
    : "If recommending a video, include the title and URL naturally."
}
`.trim()
      : "";

  return [profile, memorySection, workoutsSection, contentSection]
    .filter(Boolean)
    .join("\n\n");
};
