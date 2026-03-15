import { Document, Types } from "mongoose";

/* ─────────────────────────────────────────────
ENUM TYPES
───────────────────────────────────────────── */

export type MuscleGroup =
  | "upper_body"
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "lower_body"
  | "legs"
  | "glutes"
  | "core"
  | "full_body"
  | "cardio"
  | "boxing";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type IntensityMeasure = "RPE" | "RIR" | "%1RM";

export type CoachingStyle = "strict" | "chill" | "balanced";

export type TrainerSpecialty =
  | "maintain_physique"
  | "muscle_gain"
  | "weight_loss"
  | "nutrition"
  | "boxing";

/* ─────────────────────────────────────────────
EXERCISE STEP
───────────────────────────────────────────── */

export interface IExerciseStep {
  order: number;
  instruction: string;
  duration?: string;
  tip?: string;
}

/* ─────────────────────────────────────────────
EXERCISE
───────────────────────────────────────────── */

export interface IExercise {
  _id?: Types.ObjectId;

  name: string;
  muscleGroup: MuscleGroup;

  difficulty: Difficulty;

  equipment: string;

  sets: number;
  reps: string;
  restTime: string;
  rpe?: string;

  steps: IExerciseStep[];

  substitutions?: {
    noBarbell?: string;
    noMachine?: string;
    homeOnly?: string;
    hotelGym?: string;
  };

  tags?: string[];

  videoUrl?: string;

  isAiGenerated: boolean;
  isApproved: boolean;
}

/* ─────────────────────────────────────────────
EXERCISE BLOCK
───────────────────────────────────────────── */

export interface IExerciseBlock {
  _id?: Types.ObjectId;

  name: string;
  description?: string;

  category: MuscleGroup;

  exercises: IExercise[];

  isAiGenerated: boolean;
  isApproved: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/* ─────────────────────────────────────────────
TRAINER KNOWLEDGE PACK
───────────────────────────────────────────── */

export interface ITrainerKnowledgePack {
  daysPerWeek?: number;

  preferredSplits?: string[];

  repRanges?: string;
  restTimes?: string;

  intensityMeasure?: IntensityMeasure;

  deloadFrequency?: string;
  cardioPhilosophy?: string;

  mustUseExercises?: string[];
  avoidExercises?: string[];
  accessoryFavorites?: string[];

  proteinTarget?: string;
  hydrationRule?: string;
  maintenancePlate?: string;
  weekendStrategy?: string;

  consistencyMethod?: string;
  motivationDropResponse?: string;
  plateauProtocol?: string;
  deloadRules?: string;

  naturalPhrases?: string[];
  neverSayPhrases?: string[];

  coachingStyle?: CoachingStyle;
}

/* ─────────────────────────────────────────────
TRAINER
───────────────────────────────────────────── */

export interface ITrainer extends Document {
  userId: Types.ObjectId;

  name: string;
  bio?: string;
  profileImage?: string;

  certifications: string[];

  specialty: TrainerSpecialty;

  trainingStyleTags: string[];

  availabilityOptions: {
    aiProgram: boolean;
    oneOnOne: boolean;
  };

  systemPrompt?: string;

  knowledgePack?: ITrainerKnowledgePack;

  exerciseBlocks: IExerciseBlock[];

  subscriptionPrice: {
    free: boolean;
    paid?: number;
    premium?: number;
  };

  subscriberCount: number;

  isActive: boolean;
  isVerified: boolean;

  createdAt: Date;
  updatedAt: Date;
}
