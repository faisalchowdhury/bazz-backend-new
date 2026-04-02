import { Document, Types } from "mongoose";

// ─────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────

export type TMessageRole = "user" | "assistant";
export type TChatType = "default_plan" | "trainer";
export type TMessageStatus = "sent" | "failed";

// NEW: tracks which interface the message came from
// "text"      → normal chat message
// "anam_call" → message during an Anam AI video call
export type TMessageSource = "text" | "anam_call";

// ─────────────────────────────────────────────────────────────
// SINGLE MESSAGE
// ─────────────────────────────────────────────────────────────

export interface IMessage {
  _id?: Types.ObjectId;
  role: TMessageRole;
  content: string;
  status: TMessageStatus;

  // NEW: which interface sent this message
  source: TMessageSource;

  // Optional workout context (text chat only)
  workoutContext?: {
    workoutId?: Types.ObjectId;
    focusArea?: string;
    goal?: string;
    planSummary?: string;
  };

  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────
// CHAT THREAD
// One thread per user per trainer — stores BOTH text and call messages
// ─────────────────────────────────────────────────────────────

export interface IChat extends Document {
  userId: Types.ObjectId;
  trainerId?: Types.ObjectId;
  chatType: TChatType;

  trainerPersona?: {
    name: string;
    specialty: string;
    systemPrompt: string;
  };

  // All messages — text + anam_call — stored together
  // Filter by source to get only call or only text messages
  messages: IMessage[];
  totalMessages: number;
  lastMessageAt?: Date;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────
// REQUEST / RESPONSE SHAPES
// ─────────────────────────────────────────────────────────────

export interface ISendMessagePayload {
  message: string;
  workoutContext?: {
    workoutId?: string;
    focusArea?: string;
    goal?: string;
    planSummary?: string;
  };
}

export interface IChatResponse {
  userMessage: IMessage;
  assistantMessage: IMessage;
  chatId: string;
}
