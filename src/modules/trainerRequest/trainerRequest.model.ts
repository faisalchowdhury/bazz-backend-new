import mongoose, { Schema } from "mongoose";
import { ITrainerRequest } from "./trainerRequest.interface";

const trainerRequestSchema = new Schema<ITrainerRequest>(
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
      required: true,
      index: true,
    },

    note: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },

    rejectionReason: { type: String },

    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true },
);

// One user can only have ONE active (pending/accepted) request at a time
trainerRequestSchema.index({ userId: 1, status: 1 });
trainerRequestSchema.index({ trainerId: 1, status: 1 });

export const TrainerRequestModel = mongoose.model<ITrainerRequest>(
  "TrainerRequest",
  trainerRequestSchema,
);
