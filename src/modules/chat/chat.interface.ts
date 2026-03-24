import { Document, Types } from "mongoose";

// ─────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────

export type TMessageRole = "user" | "assistant";
export type TChatType = "default_plan" | "trainer";
export type TMessageStatus = "sent" | "failed";

// ─────────────────────────────────────────────────────────────
// SINGLE MESSAGE
// ─────────────────────────────────────────────────────────────

export interface IMessage {
  _id?: Types.ObjectId;
  role: TMessageRole;
  content: string;
  status: TMessageStatus;

  // Optional workout context the user can attach
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
// One thread per user per trainer
// One thread per user for default plan
// ─────────────────────────────────────────────────────────────

export interface IChat extends Document {
  userId: Types.ObjectId;
  trainerId?: Types.ObjectId;
  chatType: TChatType;

  // Snapshotted trainer persona — null for default plan
  trainerPersona?: {
    name: string;
    specialty: string;
    systemPrompt: string;
  };

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
