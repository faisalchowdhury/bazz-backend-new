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

// How many previous messages to inject into each AI call
const CHAT_HISTORY_WINDOW = 10;

// ─────────────────────────────────────────────────────────────
// DEFAULT PLAN SYSTEM PROMPT
// Generic fitness AI — no trainer persona
// ─────────────────────────────────────────────────────────────

const DEFAULT_PLAN_SYSTEM_PROMPT = `
You are a professional AI fitness coach.
Your job is to help users achieve their fitness goals with personalized workout plans,
exercise guidance, nutrition tips, and motivation.

You are knowledgeable, supportive, and practical.
You give clear, actionable advice based on the user's goal, fitness level, and history.

RULES:
- Always personalize responses based on the user context injected below.
- Never give medical advice — refer users to a doctor for injuries or health conditions.
- Never recommend steroids, PEDs, or extreme restriction.
- Keep responses concise and structured.
- Always end your response with ONE short follow-up question to keep the conversation going.
`.trim();

// ─────────────────────────────────────────────────────────────
// GET OR CREATE CHAT THREAD
// One thread per user per trainer, or one thread for default plan
// ─────────────────────────────────────────────────────────────

export const getOrCreateChatThread = async (
  userId: string,
  chatType: "default_plan" | "trainer",
  trainerId?: string,
): Promise<IChat> => {
  const query: any = { userId, chatType };
  if (chatType === "trainer" && trainerId) query.trainerId = trainerId;

  // Return existing thread if found
  let chat = await ChatModel.findOne(query);
  if (chat) return chat;

  // Build new thread data
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
    // Snapshot trainer persona so chat stays consistent even if trainer updates later
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
// Builds full personalized context → calls AI → saves both messages
// ─────────────────────────────────────────────────────────────

export const sendMessage = async (
  userId: string,
  payload: ISendMessagePayload,
  chatType: "default_plan" | "trainer",
  trainerId?: string,
): Promise<IChatResponse> => {
  // 1. Load user profile
  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");

  // 2. Get or create chat thread
  const chat = await getOrCreateChatThread(userId, chatType, trainerId);

  // 3. Get user memory (only for trainer plan — memory is per trainer)
  const memory = trainerId ? user.getMemoryForTrainer(trainerId) : null;

  // 4. Load last 3 completed workouts for context
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

  // 5. Build personalized user context injected into every message
  const userContext = buildUserContext(
    user,
    memory,
    recentWorkouts,
    payload.workoutContext,
  );

  // 6. Get last 10 messages for conversation history
  const last10 = chat.messages.slice(-CHAT_HISTORY_WINDOW);

  // 7. Format for AI conversation history
  const conversationHistory = last10.map((msg: IMessage) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  // 8. Pick system prompt — trainer persona or default plan
  const systemPrompt =
    chatType === "trainer" && chat.trainerPersona?.systemPrompt
      ? buildTrainerSystemPrompt(chat.trainerPersona, userContext)
      : buildDefaultSystemPrompt(userContext);

  // 9. Build user message — append workout context if attached
  let userMessageContent = payload.message;
  if (payload.workoutContext?.planSummary) {
    userMessageContent += `\n\n[Today's workout context: ${payload.workoutContext.planSummary}]`;
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
    content: payload.message, // save original message without appended context
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

  // 12. Save both messages + update stats
  chat.messages.push(userMsg as any);
  chat.messages.push(assistantMsg as any);
  chat.totalMessages = (chat.totalMessages || 0) + 2;
  chat.lastMessageAt = new Date();
  await chat.save();

  // 13. Return saved messages with their DB _ids
  const saved = chat.messages.slice(-2);
  const savedUser = saved[0];
  const savedAssist = saved[1];

  return {
    userMessage: savedUser,
    assistantMessage: savedAssist,
    chatId: (chat._id as Types.ObjectId).toString(),
  };
};

// ─────────────────────────────────────────────────────────────
// GET CHAT HISTORY
// Paginated — most recent messages first
// ─────────────────────────────────────────────────────────────

export const getChatHistory = async (
  userId: string,
  chatType: "default_plan" | "trainer",
  trainerId?: string,
  page = 1,
  limit = 20,
): Promise<{
  messages: IMessage[];
  totalMessages: number;
  chatId: string;
  chatType: string;
  trainerPersona?: any;
  hasMore: boolean;
}> => {
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
// GET ALL CHAT THREADS FOR USER
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
// Wipes messages but keeps the thread alive
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

// Default plan — generic AI, no trainer personality
const buildDefaultSystemPrompt = (userContext: string): string =>
  `
${DEFAULT_PLAN_SYSTEM_PROMPT}

═══════════════════════════════
USER CONTEXT (personalize every response using this):
${userContext}
═══════════════════════════════

Respond naturally as if you know this person well. 
Never say "based on your profile" — just use the info naturally.
`.trim();

// Trainer plan — full trainer persona injected
const buildTrainerSystemPrompt = (
  persona: { name: string; specialty: string; systemPrompt: string },
  userContext: string,
): string =>
  `
${persona.systemPrompt}

═══════════════════════════════
USER CONTEXT (personalize every response using this):
${userContext}
═══════════════════════════════

You are ${persona.name}. Always respond in your exact voice, tone, and style.
Reference the user's history and current condition naturally — never robotically.
Never break character. Never mention you are an AI.
`.trim();

// ─────────────────────────────────────────────────────────────
// USER CONTEXT BUILDER
// Builds the personalized context string injected into every prompt
// ─────────────────────────────────────────────────────────────

const buildUserContext = (
  user: any,
  memory: any,
  recentWorkouts: any[],
  workoutContext?: any,
): string => {
  const profile = `
PROFILE:
- Name: ${user.firstName} ${user.lastName}
- Goal: ${user.primaryGoal || "not set"}
- Fitness level: ${user.fitnessLevel || "unknown"}
- Height: ${user.height || "N/A"} cm | Weight: ${user.weight || "N/A"} kg
- Injuries / limitations: ${user.injuries?.join(", ") || "none"}
- Available equipment: ${user.availableEquipment || "unknown"}
- Training days/week: ${user.trainingDaysPerWeek || "not set"}
`.trim();

  // Only injected for trainer plan users who have memory
  const memorySection = memory
    ? `
TRAINING MEMORY:
- Experience level: ${memory.profileMemory?.experienceLevel || "unknown"}
- Equipment preference: ${memory.profileMemory?.equipment || "unknown"}
- Motivation style: ${memory.profileMemory?.motivationStyle || "balanced"}
- Known limitations: ${memory.profileMemory?.limitations || "none"}
- Preferences: ${memory.profileMemory?.preferences || "none"}
- Active flags: ${memory.rollingMemory?.flags?.join(", ") || "none"}
- Adherence notes: ${memory.rollingMemory?.adherenceNotes || "none"}
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
      : "RECENT WORKOUTS: No completed workouts yet.";

  const todaySection = workoutContext
    ? `
TODAY'S WORKOUT:
- Focus area: ${workoutContext.focusArea || "N/A"}
- Goal: ${workoutContext.goal || "N/A"}
- Plan summary: ${workoutContext.planSummary || "N/A"}
`.trim()
    : "";

  return [profile, memorySection, workoutsSection, todaySection]
    .filter(Boolean)
    .join("\n\n");
};
