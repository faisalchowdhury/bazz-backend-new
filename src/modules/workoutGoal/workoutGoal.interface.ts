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
// PLANNED EXERCISE (AI selected from trainer's block)
// ─────────────────────────────────────────────────────────────

export interface IExerciseStep {
  order: number;
  instruction: string;
  tip?: string;
  duration?: string;
}

export interface ISubstitutions {
  noBarbell?: string;
  noMachine?: string;
  homeOnly?: string;
  hotelGym?: string;
}

export interface IPlannedExercise {
  // Reference back to trainer's exercise block
  exerciseId?: Types.ObjectId;
  exerciseName: string;
  blockId?: Types.ObjectId;
  blockName?: string;
  muscleGroup?: string;

  // Trainer-defined prescription
  sets: number;
  reps: string; // e.g. "8-12" or "30 seconds"
  restTime: string; // e.g. "60s"
  rpe?: string; // e.g. "7-8"

  // Steps from trainer's block
  steps: IExerciseStep[];
  substitutions?: ISubstitutions;

  // Order in today's workout
  order: number;

  // Completion tracking (filled by user)
  isCompleted: boolean;
  completedSets?: number;
  actualWeight?: string; // e.g. "135lb"
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
// AI GENERATED PLAN (attached to the workout goal)
// ─────────────────────────────────────────────────────────────

export interface IAIGeneratedPlan {
  // AI coach overview
  coachNote: string; // e.g. "Focus on controlled reps today"
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

  // Check-in (filled after session)
  checkInQuestion: string;
  checkInResponse?: string;
  checkInRespondedAt?: Date;

  // Generation metadata
  generatedAt: Date;
  trainerPersona: string; // e.g. "Gabriel Rowling"
  trainerSpecialty: string; // e.g. "maintain_physique"

  // AI context snapshot (for debugging/memory)
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
  // ── Existing fields (unchanged) ───────────────────────────
  userId: Types.ObjectId;
  goal: string[]; // e.g. ["muscle_gain"]
  focusArea: string[]; // e.g. ["upper_body", "chest"]
  workout_environment: string[]; // e.g. ["full_gym"]
  equipment_availablity: string[]; // e.g. ["barbell", "dumbbells"]
  workout_intensity: string[]; // e.g. ["moderate"]
  duration: number; // in minutes
  date: Date;

  // ── NEW: Trainer reference ────────────────────────────────
  trainerId?: Types.ObjectId; // which trainer's blocks were used

  // ── NEW: AI generated plan ────────────────────────────────
  aiPlan?: IAIGeneratedPlan;

  // ── NEW: Session status ───────────────────────────────────
  status: TSessionStatus;
  startedAt?: Date;
  completedAt?: Date;
  actualDurationMinutes?: number;

  // ── Timestamps ────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}
