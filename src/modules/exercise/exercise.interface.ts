import { Document, Types } from "mongoose";

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

export interface IExerciseSubstitutions {
  noBarbell?: string;
  noMachine?: string;
  homeOnly?: string;
  hotelGym?: string;
}

export interface IExercise extends Document {
  blockId: Types.ObjectId; // ref → ExerciseBlock
  trainerId: Types.ObjectId; // ref → Trainer (denormalized for fast queries)

  name: string;
  muscleGroup: MuscleGroup;
  difficulty: Difficulty;
  equipment: string;

  sets: number;
  reps: string; // "8-12" or "30 seconds"
  restTime: string; // "60s"
  rpe?: string; // "7-8"

  substitutions?: IExerciseSubstitutions;

  tags?: string[];
  videoUrl?: string;

  isAiGenerated: boolean;
  isApproved: boolean;

  createdAt: Date;
  updatedAt: Date;
}
