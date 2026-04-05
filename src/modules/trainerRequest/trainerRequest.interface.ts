import { Document, Types } from "mongoose";

export type TRequestStatus = "pending" | "accepted" | "rejected" | "cancelled";

export interface ITrainerRequest extends Document {
  userId: Types.ObjectId; // ref → User
  trainerId: Types.ObjectId; // ref → Trainer

  // User writes this when sending request
  note: string;

  status: TRequestStatus;

  // Trainer fills this when rejecting
  rejectionReason?: string;

  // Timestamps
  acceptedAt?: Date;
  rejectedAt?: Date;
  cancelledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
