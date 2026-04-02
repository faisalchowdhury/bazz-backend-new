import mongoose, { Schema } from "mongoose";
import { IAnamSession } from "./anamSession.interface";

const anamSessionSchema = new Schema<IAnamSession>(
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

    personaId: { type: String, required: true },
    anamSessionId: { type: String },

    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    durationSeconds: { type: Number },

    status: {
      type: String,
      enum: ["active", "completed", "failed"],
      default: "active",
    },
  },
  { timestamps: true },
);

anamSessionSchema.index({ userId: 1, status: 1 });
anamSessionSchema.index({ trainerId: 1 });

export const AnamSessionModel =
  (mongoose.models.AnamSession as mongoose.Model<IAnamSession>) ||
  mongoose.model<IAnamSession>("AnamSession", anamSessionSchema);
