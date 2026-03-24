import mongoose, { Schema } from "mongoose";
import { IChat, IMessage } from "./chat.interface";

// ─────────────────────────────────────────────────────────────
// MESSAGE SUB-SCHEMA
// ─────────────────────────────────────────────────────────────

const messageSchema = new Schema<IMessage>(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    status: { type: String, enum: ["sent", "failed"], default: "sent" },

    workoutContext: {
      workoutId: { type: Schema.Types.ObjectId, ref: "Workout" },
      focusArea: { type: String },
      goal: { type: String },
      planSummary: { type: String },
    },

    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

// ─────────────────────────────────────────────────────────────
// CHAT THREAD SCHEMA
// ─────────────────────────────────────────────────────────────

const chatSchema = new Schema<IChat>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: "Trainer",
    },

    // "default_plan" → generic AI | "trainer" → trainer persona
    chatType: {
      type: String,
      enum: ["default_plan", "trainer"],
      required: true,
    },

    // Snapshotted trainer persona — null for default plan users
    trainerPersona: {
      name: { type: String },
      specialty: { type: String },
      systemPrompt: { type: String },
    },

    messages: [messageSchema],
    totalMessages: { type: Number, default: 0 },
    lastMessageAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ─────────────────────────────────────────────────────────────
// INDEXES
// One chat thread per user per trainer
// One chat thread per user for default plan
// ─────────────────────────────────────────────────────────────

chatSchema.index({ userId: 1, trainerId: 1 }, { unique: true, sparse: true });
chatSchema.index({ userId: 1, chatType: 1 });
chatSchema.index({ userId: 1, chatType: 1, trainerId: 1 });
chatSchema.index({ lastMessageAt: -1 });

// ─────────────────────────────────────────────────────────────
// MODEL — guard prevents OverwriteModelError
// ─────────────────────────────────────────────────────────────

export const ChatModel =
  (mongoose.models.Chat as mongoose.Model<IChat>) ||
  mongoose.model<IChat>("Chat", chatSchema);
