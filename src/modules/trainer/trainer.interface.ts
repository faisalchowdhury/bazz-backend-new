import { Document, Types } from "mongoose";

export type TrainerSpecialty =
  | "maintain_physique"
  | "muscle_gain"
  | "weight_loss"
  | "nutrition"
  | "boxing";

export type TrainerOnboardingGoal =
  | "maintain_physique"
  | "muscle_gain"
  | "weight_loss"
  | "boxing";

// ─────────────────────────────────────────────────────────────
// ANAM AI PERSONA (new)
// Trainer sets their personaId from Anam dashboard via app form
// ─────────────────────────────────────────────────────────────

export interface ITrainerAnamAI {
  personaId: string; // from Anam AI dashboard
  isEnabled: boolean; // true once personaId is set
}

export interface ITrainer extends Document {
  userId: Types.ObjectId;

  // Human Brand Layer
  name: string;
  bio?: string;
  profileImage?: string;
  certifications: string[];
  specialty: TrainerSpecialty;
  trainingStyleTags: string[];

  // AI Layer
  systemPrompt?: string;

  // Anam AI Integration (new)
  anamAI?: ITrainerAnamAI;

  // Monetization
  subscriptionPrice: {
    free?: boolean;
    paid?: number;
    premium?: number;
  };

  subscriberCount: number;
  isActive: boolean;
  isVerified: boolean;

  // Default app trainer for promo-code / website subscribers
  isDefault?: boolean;

  // Built-in P2P trainers (seeded, goal-mapped at onboarding)
  isBuiltIn?: boolean;
  personaKey?: string;
  slug?: string;
  onboardingGoal?: TrainerOnboardingGoal;
  onboardingPriority?: number;

  createdAt: Date;
  updatedAt: Date;
}
