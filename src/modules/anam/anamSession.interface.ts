import { Document, Types } from "mongoose";

export type TAnamSessionStatus = "active" | "completed" | "failed";

export interface IAnamSession extends Document {
  userId: Types.ObjectId; // ref → User
  trainerId: Types.ObjectId; // ref → Trainer

  // Anam AI identifiers
  personaId: string; // trainer's Anam persona ID
  anamSessionId?: string; // session ID returned by Anam API

  // Timing
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;

  status: TAnamSessionStatus;

  createdAt: Date;
  updatedAt: Date;
}
