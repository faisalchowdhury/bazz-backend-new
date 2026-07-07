import { Types } from "mongoose";
import { AnamSessionModel } from "./anamSession.model";
import { ChatModel } from "../chat/chat.model";
import { UserModel } from "../user/user.model";
import { TrainerModel } from "../trainer/trainer.model";
import { WorkoutModel } from "../workoutGoal/workoutGoal.model";
import { callAI } from "../../services/ai.service";
import { findRelevantContent } from "../content/content.service";
import { ANAM_API_KEY, ANAM_CUSTOM_LLM_ID } from "../../config";

const ANAM_API_URL = "https://api.anam.ai/v1";

// ─────────────────────────────────────────────────────────────
// ANAM — CREATE SESSION TOKEN (server-side, for Flutter/Web SDK)
// POST /v1/auth/session-token
// Uses trainer personaId + CUSTOMER_CLIENT_V1 so our backend owns the AI brain.
// ─────────────────────────────────────────────────────────────

const createAnamSessionToken = async (personaId: string): Promise<string> => {
  const apiKey = ANAM_API_KEY || process.env.ANAM_API_KEY || "";

  if (!apiKey) {
    throw new Error(
      "ANAM_API_KEY is not configured. Add it to your .env file and restart the server.",
    );
  }

  const personaConfig: Record<string, string> = { personaId };
  if (ANAM_CUSTOM_LLM_ID) {
    personaConfig.llmId = ANAM_CUSTOM_LLM_ID;
  }

  const response = await fetch(`${ANAM_API_URL}/auth/session-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ personaConfig }),
  });

  if (!response.ok) {
    const errText = await response.text();
    let detail = errText;
    try {
      const parsed = JSON.parse(errText) as { error?: string; message?: string };
      detail = parsed.error || parsed.message || errText;
    } catch {
      // use raw text
    }

    if (response.status === 401) {
      throw new Error(
        `Invalid ANAM_API_KEY. Create a new key at https://lab.anam.ai/api-keys and update .env, then restart the server. (${detail})`,
      );
    }
    if (response.status === 400 || response.status === 404) {
      throw new Error(
        `Invalid Anam personaId "${personaId}". Update the trainer persona via PUT /api/v1/trainer/:trainerId/anam with a persona from your Anam Lab account. (${detail})`,
      );
    }

    throw new Error(`Anam API error: ${response.status} — ${detail}`);
  }

  const data = (await response.json()) as { sessionToken?: string };
  if (!data.sessionToken) {
    throw new Error("Anam API did not return a sessionToken");
  }

  return data.sessionToken;
};

// How many previous messages to inject (same as chat)
const CALL_HISTORY_WINDOW = 10;

// Platform default monthly limit
const DEFAULT_MONTHLY_LIMIT = 250;

// ─────────────────────────────────────────────────────────────
// HELPER — CHECK AND RESET MONTHLY PERIOD
// If 30 days have passed since currentPeriodStart → reset usage
// ─────────────────────────────────────────────────────────────

const checkAndResetMonthlyPeriod = (user: any): void => {
  const now = new Date();

  // Initialize anamAI if user doesn't have it yet
  if (!user.anamAI) {
    user.anamAI = {
      monthlyMinutesLimit: DEFAULT_MONTHLY_LIMIT,
      minutesUsedThisMonth: 0,
      currentPeriodStart: now,
      totalMinutesAllTime: 0,
    };
    return;
  }

  const periodStart = new Date(user.anamAI.currentPeriodStart);
  const daysSincePeriodStart =
    (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);

  // Reset if 30 days have passed
  if (daysSincePeriodStart >= 30) {
    user.anamAI.minutesUsedThisMonth = 0;
    user.anamAI.currentPeriodStart = now;
  }
};

// ─────────────────────────────────────────────────────────────
// HELPER — GET USAGE SUMMARY
// ─────────────────────────────────────────────────────────────

const getUsageSummary = (user: any) => {
  const anam = user.anamAI;
  const limit = anam?.monthlyMinutesLimit || DEFAULT_MONTHLY_LIMIT;
  const used = anam?.minutesUsedThisMonth || 0;
  const remaining = Math.max(0, limit - used);

  const periodStart = anam?.currentPeriodStart
    ? new Date(anam.currentPeriodStart)
    : new Date();

  // Reset date = periodStart + 30 days
  const resetDate = new Date(periodStart);
  resetDate.setDate(resetDate.getDate() + 30);

  return { limit, used, remaining, resetDate };
};

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
// GET ANAM USAGE
// Returns user's current usage, limit, remaining and reset date
// ─────────────────────────────────────────────────────────────

export const getAnamUsage = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");

  checkAndResetMonthlyPeriod(user);
  await user.save();

  const { limit, used, remaining, resetDate } = getUsageSummary(user);

  return {
    monthlyMinutesLimit: limit,
    minutesUsedThisMonth: used,
    minutesRemaining: remaining,
    periodResetDate: resetDate,
    totalMinutesAllTime: user.anamAI?.totalMinutesAllTime || 0,
    isLimitReached: remaining <= 0,
  };
};

// ─────────────────────────────────────────────────────────────
// START ANAM SESSION
// 1. Check monthly minute limit — block if exceeded
// 2. Verify trainer has Anam enabled
// 3. Create Anam session via API (get session token)
// 4. Save AnamSession to DB
// Returns: { sessionToken, anamSessionId, dbSessionId, usage }
// ─────────────────────────────────────────────────────────────

export const startAnamSession = async (userId: string, trainerId: string) => {
  // 1. Load user and check/reset monthly period
  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");

  checkAndResetMonthlyPeriod(user);

  // 2. Check if monthly limit is reached
  const { limit, used, remaining, resetDate } = getUsageSummary(user);

  if (remaining <= 0) {
    throw new Error(
      `You have reached your ${limit} minute monthly limit. ` +
        `Your limit resets on ${resetDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}.`,
    );
  }

  // 3. Save updated period (in case it was reset)
  await user.save();

  // 4. Load trainer and verify Anam is set up
  const trainer = await TrainerModel.findById(trainerId);
  console.log(trainer);
  if (!trainer) throw new Error("Trainer not found");
  if (!trainer.anamAI?.isEnabled || !trainer.anamAI?.personaId) {
    throw new Error("This trainer has not set up their Anam AI video call yet");
  }

  // 5. Check no active session already exists for this user+trainer
  const existingActive = await AnamSessionModel.findOne({
    userId,
    trainerId,
    status: "active",
  });
  if (existingActive) {
    throw new Error("You already have an active call session. End it first.");
  }

  // 6. Get session token from Anam (required for client video SDK)
  const sessionToken = await createAnamSessionToken(trainer.anamAI.personaId);

  // 7. Save session to DB
  const dbSession = await AnamSessionModel.create({
    userId,
    trainerId,
    personaId: trainer.anamAI.personaId,
    startedAt: new Date(),
    status: "active",
  });

  return {
    dbSessionId: (dbSession._id as Types.ObjectId).toString(),
    sessionToken,
    personaId: trainer.anamAI.personaId,
    trainerName: trainer.name,
    customLlm: true,
    llmId: ANAM_CUSTOM_LLM_ID,
    integrationMode: "client_custom_llm",
    flutterHint:
      "Use MESSAGE_HISTORY_UPDATED → POST /anam/session/:dbSessionId/message → anamClient.talk(reply). Do NOT use sendUserMessage for assistant replies.",
    // Return current usage so frontend can show remaining minutes
    usage: {
      minutesRemaining: remaining,
      minutesUsedThisMonth: used,
      monthlyMinutesLimit: limit,
      periodResetDate: resetDate,
    },
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
    content: msg.role === "assistant" ? cleanAnamResponse(msg.content) : msg.content,
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

  const cleanedResponseText = cleanAnamResponse(aiResponseText);

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
    content: cleanedResponseText,
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
// Calculates duration → updates user's monthly minutes used
// ─────────────────────────────────────────────────────────────

export const endAnamSession = async (userId: string, dbSessionId: string) => {
  // 1. Find active session
  const session = await AnamSessionModel.findOne({
    _id: dbSessionId,
    userId,
    status: "active",
  });
  if (!session) throw new Error("No active session found");

  // 2. Calculate duration
  const endedAt = new Date();
  const durationSeconds = Math.round(
    (endedAt.getTime() - session.startedAt.getTime()) / 1000,
  );
  // Round up to nearest minute for billing fairness
  const durationMinutes = Math.ceil(durationSeconds / 60);

  // 3. Mark session complete
  session.status = "completed";
  session.endedAt = endedAt;
  session.durationSeconds = durationSeconds;
  await session.save();

  // 4. Update user's monthly minutes usage
  const user = await UserModel.findById(userId);
  if (user) {
    checkAndResetMonthlyPeriod(user);

    // Initialize anamAI block if not set yet
    if (!user.anamAI) {
      user.anamAI = {
        monthlyMinutesLimit: DEFAULT_MONTHLY_LIMIT,
        minutesUsedThisMonth: 0,
        currentPeriodStart: new Date(),
        totalMinutesAllTime: 0,
      };
    }

    // Add this call's duration to monthly + all-time totals
    user.anamAI.minutesUsedThisMonth += durationMinutes;
    user.anamAI.totalMinutesAllTime += durationMinutes;
    await user.save();

    const { limit, used, remaining, resetDate } = getUsageSummary(user);

    return {
      sessionId: (session._id as Types.ObjectId).toString(),
      durationSeconds,
      durationMinutes,
      endedAt,
      // Return updated usage so frontend can refresh the minutes display
      usage: {
        minutesUsedThisMonth: used,
        monthlyMinutesLimit: limit,
        minutesRemaining: remaining,
        periodResetDate: resetDate,
        totalMinutesAllTime: user.anamAI.totalMinutesAllTime,
      },
    };
  }

  return {
    sessionId: (session._id as Types.ObjectId).toString(),
    durationSeconds,
    durationMinutes,
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
  const callMessages = chatThread.messages
    .filter((m: any) => m.source === "anam_call")
    .map((m: any) => {
      const obj = m.toObject ? m.toObject() : m;
      if (obj.role === "assistant" && obj.content) {
        obj.content = cleanAnamResponse(obj.content);
      }
      return obj;
    });

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

CRITICAL INSTRUCTIONS:
1. Provide your response as raw, plain, conversational text ONLY.
2. Do NOT output JSON, and do NOT wrap your response in markdown code blocks or JSON structures like {"response": "..."}.
3. Respond directly as you would speak to the client in a real conversation.
`.trim();

/** Clean up assistant's response to ensure it's raw plain text and not wrapped in any JSON/code blocks */
export const cleanAnamResponse = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed) return "";

  let extracted = trimmed;

  // 1. Try to extract JSON from markdown code blocks
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  // 2. Try parsing as JSON
  try {
    if (candidate.startsWith("{") && candidate.endsWith("}")) {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.response === "string") {
          extracted = parsed.response.trim();
        } else if (typeof parsed.message === "string") {
          extracted = parsed.message.trim();
        } else if (typeof parsed.content === "string") {
          extracted = parsed.content.trim();
        } else if (typeof parsed.text === "string") {
          extracted = parsed.text.trim();
        }
      }
    }
  } catch (err) {
    // If JSON parsing fails, fallback
  }

  // 3. Regex search for "response": "..." if JSON parsing failed but it has that pattern
  if (extracted === trimmed) {
    const responsePattern = /"response"\s*:\s*"([\s\S]*?)"\s*\}?$/i;
    const match = candidate.match(responsePattern);
    if (match && match[1]) {
      try {
        extracted = JSON.parse(`"${match[1]}"`);
      } catch {
        extracted = match[1]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .trim();
      }
    }
  }

  // 4. Strip any occurrences of newlines (e.g. \n\n or \n) and replace them with spaces, collapsing consecutive spaces
  return extracted
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// Build user context — isAnamCall changes video section (title only vs title + URL)
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
