import { Document, Types } from "mongoose";

export type IntensityMeasure = "RPE" | "RIR" | "%1RM";
export type CoachingStyle = "strict" | "chill" | "balanced";

export interface ITrainerKnowledgePack extends Document {
  trainerId: Types.ObjectId; // ref → Trainer (one-to-one)

  // A — Programming
  daysPerWeek?: number;
  preferredSplits?: string[];
  repRanges?: string;
  restTimes?: string;
  intensityMeasure?: IntensityMeasure;
  deloadFrequency?: string;
  cardioPhilosophy?: string;

  // B — Exercise preferences
  mustUseExercises?: string[];
  avoidExercises?: string[];
  accessoryFavorites?: string[];

  // C — Nutrition (general, non-medical)
  proteinTarget?: string;
  hydrationRule?: string;
  maintenancePlate?: string;
  weekendStrategy?: string;

  // D — Client psychology
  consistencyMethod?: string;
  motivationDropResponse?: string;
  plateauProtocol?: string;
  deloadRules?: string;

  // G — Brand voice
  naturalPhrases?: string[];
  neverSayPhrases?: string[];
  coachingStyle?: CoachingStyle;

  createdAt: Date;
  updatedAt: Date;
}
