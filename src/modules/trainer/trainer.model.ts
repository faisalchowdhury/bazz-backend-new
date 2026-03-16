import mongoose, { Schema } from "mongoose";
import { ITrainer } from "./trainer.interface";

const trainerSchema = new Schema<ITrainer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Human Brand Layer
    name: { type: String, required: true },
    bio: { type: String },
    profileImage: { type: String },
    certifications: [{ type: String }],
    specialty: {
      type: String,
      enum: [
        "maintain_physique",
        "muscle_gain",
        "weight_loss",
        "nutrition",
        "boxing",
      ],
      required: true,
    },
    trainingStyleTags: [{ type: String }],

    // AI Layer
    systemPrompt: { type: String },

    // Monetization
    subscriptionPrice: {
      free: { type: Boolean, default: true },
      paid: { type: Number },
      premium: { type: Number },
    },

    subscriberCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

trainerSchema.index({ specialty: 1, isActive: 1, isVerified: 1 });

export const TrainerModel = mongoose.model<ITrainer>("Trainer", trainerSchema);
