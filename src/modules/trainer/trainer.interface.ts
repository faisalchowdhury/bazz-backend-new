import { Document, Types } from "mongoose";

export type TrainerSpecialty =
  | "maintain_physique"
  | "muscle_gain"
  | "weight_loss"
  | "nutrition"
  | "boxing";

export interface ITrainer extends Document {
  userId: Types.ObjectId; // ref → User

  // Human Brand Layer
  name: string;
  bio?: string;
  profileImage?: string;
  certifications: string[];
  specialty: TrainerSpecialty;
  trainingStyleTags: string[];

  // AI Layer — system prompt stored directly on trainer
  systemPrompt?: string;

  // Monetization
  subscriptionPrice: {
    free?: boolean;
    paid?: number;
    premium?: number;
  };

  subscriberCount: number;
  isActive: boolean;
  isVerified: boolean;

  createdAt: Date;
  updatedAt: Date;

  // NOTE: knowledgePack, exerciseBlocks, exercises, steps
  // all live in their own collections — referenced by trainerId
}
