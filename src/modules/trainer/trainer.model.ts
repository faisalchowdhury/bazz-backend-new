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

    // ── Anam AI Integration (new) ─────────────────────────────
    // Trainer sets their personaId from Anam dashboard via app form
    anamAI: {
      personaId: { type: String }, // Anam persona ID
      isEnabled: { type: Boolean, default: false },
    },

    // Monetization
    subscriptionPrice: {
      free: { type: Boolean, default: true },
      paid: { type: Number },
      premium: { type: Number },
    },

    subscriberCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },

    // The single "default app trainer" that promo-code / website
    // subscribers are attached to (they have no personal trainer).
    isDefault: { type: Boolean, default: false, index: true },

    isBuiltIn: { type: Boolean, default: false, index: true },
    personaKey: { type: String, index: true },
    slug: { type: String, unique: true, sparse: true },
    onboardingGoal: {
      type: String,
      enum: ["maintain_physique", "muscle_gain", "weight_loss", "boxing"],
    },
    onboardingPriority: { type: Number, default: 99 },
  },
  { timestamps: true },
);

trainerSchema.index({ specialty: 1, isActive: 1, isVerified: 1 });
trainerSchema.index({ onboardingGoal: 1, isBuiltIn: 1, onboardingPriority: 1 });

// Guard prevents OverwriteModelError
export const TrainerModel =
  (mongoose.models.Trainer as mongoose.Model<ITrainer>) ||
  mongoose.model<ITrainer>("Trainer", trainerSchema);
