import { Types } from "mongoose";
import { ChatModel } from "./chat.model";
import {
  IChat,
  IMessage,
  ISendMessagePayload,
  IChatResponse,
} from "./chat.interface";
import { UserModel } from "../user/user.model";
import { TrainerModel } from "../trainer/trainer.model";
import { WorkoutModel } from "../workoutGoal/workoutGoal.model";
import { callAI } from "../../services/ai.service";
import { findRelevantContent } from "../content/content.service";

// How many previous messages to inject into each AI call
const CHAT_HISTORY_WINDOW = 10;

// ─────────────────────────────────────────────────────────────
// DEFAULT PLAN SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────

const DEFAULT_PLAN_SYSTEM_PROMPT = `
You are a professional AI fitness coach.
Help users achieve their fitness goals with personalized workout plans,
exercise guidance, nutrition tips, and motivation.

RULES:
- Always personalize responses based on the user context injected below.
- Never give medical advice — refer users to a doctor for injuries or health conditions.
- Never recommend steroids, PEDs, or extreme restriction.
- Keep responses concise and structured.
- If relevant video content is provided below, recommend it naturally in your response.
- Always end your response with ONE short follow-up question.
`.trim();

// ─────────────────────────────────────────────────────────────
// KEYWORDS THAT INDICATE USER WANTS VIDEO CONTENT
// ─────────────────────────────────────────────────────────────

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

// Check if user message is asking for video content
const isVideoRequest = (message: string): boolean => {
  const lower = message.toLowerCase();
  return VIDEO_REQUEST_KEYWORDS.some((kw) => lower.includes(kw));
};

// Extract exercise name / muscle groups from user message for matching
const extractContentQuery = (message: string) => {
  const lower = message.toLowerCase();

  // Common exercises to detect
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
    rhomboid: "back",
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

  // Extract keywords from message for broader matching
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

// ─────────────────────────────────────────────────────────────
// GET OR CREATE CHAT THREAD
// ─────────────────────────────────────────────────────────────

export const getOrCreateChatThread = async (
  userId: string,
  chatType: "default_plan" | "trainer",
  trainerId?: string,
): Promise<IChat> => {
  const query: any = { userId, chatType };
  if (chatType === "trainer" && trainerId) query.trainerId = trainerId;

  let chat = await ChatModel.findOne(query);
  if (chat) return chat;

  const newChatData: any = {
    userId,
    chatType,
    messages: [],
    totalMessages: 0,
    isActive: true,
  };

  if (chatType === "trainer" && trainerId) {
    const trainer = await TrainerModel.findById(trainerId);
    if (!trainer) throw new Error("Trainer not found");

    newChatData.trainerId = trainerId;
    newChatData.trainerPersona = {
      name: trainer.name,
      specialty: trainer.specialty,
      systemPrompt: trainer.systemPrompt || DEFAULT_PLAN_SYSTEM_PROMPT,
    };
  }

  chat = await ChatModel.create(newChatData);
  return chat;
};

// ─────────────────────────────────────────────────────────────
// SEND MESSAGE
// ─────────────────────────────────────────────────────────────

export const sendMessage = async (
  userId: string,
  payload: ISendMessagePayload,
  chatType: "default_plan" | "trainer",
  trainerId?: string,
): Promise<IChatResponse> => {
  // 1. Load user
  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");

  // 2. Get or create chat thread
  const chat = await getOrCreateChatThread(userId, chatType, trainerId);

  // 3. Get user memory (trainer plan only)
  const memory = trainerId ? user.getMemoryForTrainer(trainerId) : null;

  // 4. Load last 3 completed workouts
  const recentWorkouts = await WorkoutModel.find({
    userId,
    status: "completed",
  })
    .sort({ completedAt: -1 })
    .limit(3)
    .select(
      "focusArea goal workout_intensity actualDurationMinutes completedAt aiPlan.checkInResponse aiPlan.coachNote",
    )
    .lean();

  // 5. Check if user is asking for video content
  let relevantContent: any[] = [];
  const trainerIdForContent = trainerId || user.subscribedTrainer?.toString();

  if (trainerIdForContent && isVideoRequest(payload.message)) {
    const contentQuery = extractContentQuery(payload.message);
    relevantContent = await findRelevantContent(trainerIdForContent, {
      exerciseName: contentQuery.exerciseName,
      muscleGroups: contentQuery.muscleGroups,
      keywords: contentQuery.keywords,
      limit: 3,
    });
  }

  // 6. Build user context
  const userContext = buildUserContext(
    user,
    memory,
    recentWorkouts,
    payload.workoutContext,
    relevantContent,
  );

  // 7. Get last 10 messages
  const last10 = chat.messages.slice(-CHAT_HISTORY_WINDOW);
  const conversationHistory = last10.map((msg: IMessage) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  // 8. Pick system prompt
  const systemPrompt =
    chatType === "trainer" && chat.trainerPersona?.systemPrompt
      ? buildTrainerSystemPrompt(chat.trainerPersona, userContext)
      : buildDefaultSystemPrompt(userContext);

  // 9. Build user message
  let userMessageContent = payload.message;
  if (payload.workoutContext?.planSummary) {
    userMessageContent += `\n\n[Today's workout: ${payload.workoutContext.planSummary}]`;
  }

  // 10. Call AI
  const aiResponseText = await callAI({
    systemPrompt,
    userMessage: userMessageContent,
    maxTokens: 1000,
    conversationHistory,
  });

  // 11. Build message objects
  const userMsg: IMessage = {
    role: "user",
    content: payload.message,
    status: "sent",
    workoutContext: payload.workoutContext
      ? {
          workoutId: payload.workoutContext.workoutId
            ? new Types.ObjectId(payload.workoutContext.workoutId)
            : undefined,
          focusArea: payload.workoutContext.focusArea,
          goal: payload.workoutContext.goal,
          planSummary: payload.workoutContext.planSummary,
        }
      : undefined,
    createdAt: new Date(),
  };

  const assistantMsg: IMessage = {
    role: "assistant",
    content: aiResponseText,
    status: "sent",
    createdAt: new Date(),
  };

  // 12. Save both messages
  chat.messages.push(userMsg as any);
  chat.messages.push(assistantMsg as any);
  chat.totalMessages = (chat.totalMessages || 0) + 2;
  chat.lastMessageAt = new Date();
  await chat.save();

  const saved = chat.messages.slice(-2);
  const savedUser = saved[0];
  const savedAssist = saved[1];

  return {
    userMessage: savedUser,
    assistantMessage: savedAssist,
    chatId: (chat._id as Types.ObjectId).toString(),
    // Return matched content so frontend can render video cards
    suggestedContent: relevantContent.length > 0 ? relevantContent : undefined,
  } as any;
};

// ─────────────────────────────────────────────────────────────
// GET CHAT HISTORY
// ─────────────────────────────────────────────────────────────

export const getChatHistory = async (
  userId: string,
  chatType: "default_plan" | "trainer",
  trainerId?: string,
  page = 1,
  limit = 20,
) => {
  const query: any = { userId, chatType };
  if (chatType === "trainer" && trainerId) query.trainerId = trainerId;

  const chat = await ChatModel.findOne(query);
  if (!chat) {
    return {
      messages: [],
      totalMessages: 0,
      chatId: "",
      chatType,
      hasMore: false,
    };
  }

  const all = chat.messages;
  const total = all.length;
  const startIndex = Math.max(0, total - page * limit);
  const endIndex = Math.max(0, total - (page - 1) * limit);
  const pageMsg = all.slice(startIndex, endIndex).reverse();

  return {
    messages: pageMsg,
    totalMessages: total,
    chatId: (chat._id as Types.ObjectId).toString(),
    chatType: chat.chatType,
    trainerPersona: chat.trainerPersona,
    hasMore: startIndex > 0,
  };
};

// ─────────────────────────────────────────────────────────────
// GET ALL CHAT THREADS
// ─────────────────────────────────────────────────────────────

export const getUserChatThreads = async (userId: string) => {
  return await ChatModel.find({ userId, isActive: true })
    .populate("trainerId", "name specialty profileImage")
    .select(
      "chatType trainerId trainerPersona totalMessages lastMessageAt createdAt",
    )
    .sort({ lastMessageAt: -1 })
    .lean();
};

// ─────────────────────────────────────────────────────────────
// CLEAR CHAT HISTORY
// ─────────────────────────────────────────────────────────────

export const clearChatHistory = async (
  userId: string,
  chatType: "default_plan" | "trainer",
  trainerId?: string,
): Promise<void> => {
  const query: any = { userId, chatType };
  if (chatType === "trainer" && trainerId) query.trainerId = trainerId;

  await ChatModel.findOneAndUpdate(query, {
    $set: { messages: [], totalMessages: 0, lastMessageAt: null },
  });
};

// ─────────────────────────────────────────────────────────────
// DELETE CHAT THREAD
// ─────────────────────────────────────────────────────────────

export const deleteChatThread = async (
  userId: string,
  chatId: string,
): Promise<void> => {
  await ChatModel.findOneAndDelete({ _id: chatId, userId });
};

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────

const buildDefaultSystemPrompt = (userContext: string): string =>
  `
${DEFAULT_PLAN_SYSTEM_PROMPT}

═══════════════════════════════
USER CONTEXT:
${userContext}
═══════════════════════════════

Respond naturally as if you know this person well.
If video content is listed in the context, recommend it naturally — include the title and URL.
`.trim();

const buildTrainerSystemPrompt = (
  persona: { name: string; specialty: string; systemPrompt: string },
  userContext: string,
): string =>
  `
${persona.systemPrompt}

═══════════════════════════════
USER CONTEXT:
${userContext}
═══════════════════════════════

You are ${persona.name}. Always respond in your exact voice and style.
If video content is listed in the context, recommend it naturally in your own voice — include the title and URL.
Never break character. Never mention you are an AI.
`.trim();

// ─────────────────────────────────────────────────────────────
// USER CONTEXT BUILDER
// Now includes relevant video content when found
// ─────────────────────────────────────────────────────────────

const buildUserContext = (
  user: any,
  memory: any,
  recentWorkouts: any[],
  workoutContext?: any,
  relevantContent: any[] = [],
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
      `${i + 1}. ${new Date(w.completedAt).toLocaleDateString()} | Focus: ${w.focusArea?.join(", ")} | Intensity: ${w.workout_intensity?.join(", ")} | Duration: ${w.actualDurationMinutes || "N/A"} min | Check-in: "${w.aiPlan?.checkInResponse || "none"}"`,
  )
  .join("\n")}
`.trim()
      : "RECENT WORKOUTS: None yet.";

  const todaySection = workoutContext
    ? `
TODAY'S WORKOUT:
- Focus: ${workoutContext.focusArea || "N/A"}
- Goal: ${workoutContext.goal || "N/A"}
- Summary: ${workoutContext.planSummary || "N/A"}
`.trim()
    : "";

  // Video content section — injected when AI finds relevant videos
  const contentSection =
    relevantContent.length > 0
      ? `
RELEVANT VIDEO CONTENT FROM TRAINER'S LIBRARY (recommend these if appropriate):
${relevantContent
  .map(
    (c: any, i: number) => `
${i + 1}. "${c.title}"
   Exercise: ${c.exerciseName || "N/A"}
   Muscle groups: ${c.muscleGroups?.join(", ") || "N/A"}
   Difficulty: ${c.difficulty}
   Description: ${c.description}
   Video URL: ${c.videoUrl || "N/A"}
   Tags: ${c.tags?.join(", ") || "N/A"}`,
  )
  .join("\n")}

When recommending a video, include the title and URL naturally in your response.
`.trim()
      : "";

  return [profile, memorySection, workoutsSection, todaySection, contentSection]
    .filter(Boolean)
    .join("\n\n");
};
