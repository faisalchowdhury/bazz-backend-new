import { Document, Types } from "mongoose";

// ─────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────

export type TWorkoutGoal =
  | "maintain_physique"
  | "muscle_gain"
  | "weight_loss"
  | "boxing"
  | "strength"
  | "endurance"
  | "flexibility";

export type TFocusArea =
  | "upper_body"
  | "lower_body"
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "glutes"
  | "core"
  | "full_body"
  | "cardio"
  | "boxing";

export type TWorkoutEnvironment =
  | "full_gym"
  | "home"
  | "hotel_gym"
  | "outdoor"
  | "no_equipment";

export type TEquipmentAvailability =
  | "barbell"
  | "dumbbells"
  | "machines"
  | "resistance_bands"
  | "kettlebells"
  | "pull_up_bar"
  | "bench"
  | "cable_machine"
  | "bodyweight_only"
  | "boxing_bag"
  | "jump_rope";

export type TWorkoutIntensity = "light" | "moderate" | "intense" | "max_effort";

export type TSessionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

// ─────────────────────────────────────────────────────────────
// EXERCISE STEP (snapshot copied from ExerciseStep collection)
// ─────────────────────────────────────────────────────────────

export interface IPlannedExerciseStep {
  order: number;
  instruction: string;
  tip?: string;
  duration?: string;
}

// ─────────────────────────────────────────────────────────────
// SUBSTITUTIONS (snapshot copied from Exercise collection)
// ─────────────────────────────────────────────────────────────

export interface IPlannedSubstitutions {
  noBarbell?: string;
  noMachine?: string;
  homeOnly?: string;
  hotelGym?: string;
}

// ─────────────────────────────────────────────────────────────
// PLANNED EXERCISE
// AI selects from separate Exercise + ExerciseBlock collections
// Full data snapshotted here so workout is self-contained
// ─────────────────────────────────────────────────────────────

export interface IPlannedExercise {
  // References to separate collections
  exerciseId?: Types.ObjectId; // ref → exercises collection
  blockId?: Types.ObjectId; // ref → exercise_blocks collection
  blockName?: string;
  exerciseName: string;
  muscleGroup?: string;

  // Trainer-defined prescription (snapshotted from Exercise doc)
  sets: number;
  reps: string; // "8-12" or "30 seconds"
  restTime: string; // "60s"
  rpe?: string; // "7-8"

  // Snapshotted from ExerciseStep collection
  steps: IPlannedExerciseStep[];

  // Snapshotted from Exercise collection
  substitutions?: IPlannedSubstitutions;

  // Position in today's session
  order: number;

  // Completion tracking — filled by user during session
  isCompleted: boolean;
  completedSets?: number;
  actualWeight?: string; // "135lb"
  actualRpe?: number;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────
// WARM UP / COOL DOWN STEP
// ─────────────────────────────────────────────────────────────

export interface ISessionStep {
  order: number;
  instruction: string;
  duration: string;
}

// ─────────────────────────────────────────────────────────────
// AI GENERATED PLAN
// Attached to workout document after user hits "Generate"
// ─────────────────────────────────────────────────────────────

export interface IAIGeneratedPlan {
  // Coach overview
  coachNote: string;
  thisWeekFocus: string[]; // max 3 bullets
  nutritionTip?: string;

  // Session structure
  warmUp: ISessionStep[];
  mainWork: IPlannedExercise[];
  accessories: IPlannedExercise[];
  finisher: IPlannedExercise[];
  coolDown: ISessionStep[];

  estimatedDurationMinutes: number;
  cardioGuidance?: string;

  // Suggested video matching client preferences
  suggestedVideo?: string;

  // Check-in — filled after session
  checkInQuestion: string;
  checkInResponse?: string;
  checkInRespondedAt?: Date;

  // Generation metadata
  generatedAt: Date;
  trainerPersona: string; // "Gabriel Rowling"
  trainerSpecialty: string; // "maintain_physique"

  // Context snapshot for debugging / memory
  aiContextSnapshot?: {
    userGoal: string;
    fitnessLevel: string;
    memoryFlags: string[];
    exerciseBlocksUsed: string[]; // block names AI picked from
  };
}

// ─────────────────────────────────────────────────────────────
// MAIN WORKOUT INTERFACE
// ─────────────────────────────────────────────────────────────

export interface IWorkout extends Document {
  // ── User input (form fields — unchanged) ──────────────────
  userId: Types.ObjectId;
  goal: string[]; // ["maintain_physique"]
  focusArea: string[]; // ["upper_body", "chest"]
  workout_environment: string[]; // ["full_gym"]
  equipment_availablity: string[]; // ["barbell", "dumbbells"]
  workout_intensity: string[]; // ["moderate"]
  duration: number; // minutes
  date: Date;

  // ── Trainer reference (from new separate collection) ──────
  trainerId?: Types.ObjectId; // ref → trainers collection

  // ── AI generated plan (null until user hits Generate) ─────
  aiPlan?: IAIGeneratedPlan;

  // ── Session lifecycle ─────────────────────────────────────
  status: TSessionStatus;
  startedAt?: Date;
  completedAt?: Date;
  actualDurationMinutes?: number;

  // ── Timestamps ────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}
