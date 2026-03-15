import { Document, Types } from "mongoose";

// ─────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────

export type TGender = "male" | "female" | "not_prefer_to_say";
export type TRole = "admin" | "user" | "trainer";
export type TFitnessLevel = "beginner" | "intermediate" | "advanced";
export type TGoal =
  | "maintain_physique"
  | "muscle_gain"
  | "weight_loss"
  | "boxing";
export type TSubscriptionTier = "free" | "paid" | "premium";
export type TAdherence = "completed" | "skipped" | "modified";
export type TMotivationStyle = "tough_love" | "gentle" | "balanced";
export type TEquipment =
  | "full_gym"
  | "home_only"
  | "hotel_gym"
  | "no_equipment";

// ─────────────────────────────────────────────────────────────
// SESSION SUMMARY (inside rolling memory)
// ─────────────────────────────────────────────────────────────

export interface ISessionSummary {
  _id?: Types.ObjectId;
  date: Date;
  workoutSummary: string;
  exercisesCompleted: string[];
  loadsUsed: Record<string, string>; // { "Bench Press": "135lb x 3x8" }
  adherence: TAdherence;
  rpe?: number;
  painNotes?: string;
  sleepStressRating?: number;
  energyLevel?: number;
  nextSessionPrescribed?: string;
  flags: string[];
}

// ─────────────────────────────────────────────────────────────
// USER MEMORY (per trainer)
// ─────────────────────────────────────────────────────────────

export interface IProfileMemory {
  preferredName?: string;
  goal?: TGoal;
  experienceLevel?: TFitnessLevel;
  scheduleDaysPerWeek?: number;
  equipment?: string;
  limitations?: string;
  preferences?: string;
  motivationStyle?: TMotivationStyle;
  updatedAt?: Date;
}

export interface IRollingMemory {
  last3Sessions: ISessionSummary[];
  lastKnownLoads: Record<string, string>; // { "Squat": "185lb" }
  adherenceNotes?: string;
  recoveryNotes?: string;
  flags: string[];
  updatedAt?: Date;
}

export interface IUserMemory {
  _id?: Types.ObjectId;
  trainerId: Types.ObjectId;
  profileMemory: IProfileMemory;
  rollingMemory: IRollingMemory;
  lastUpdatedAt: Date;
}

// ─────────────────────────────────────────────────────────────
// WORKOUT HISTORY
// ─────────────────────────────────────────────────────────────

export interface IExercisePerformed {
  exerciseId?: Types.ObjectId;
  exerciseName: string;
  blockName?: string;
  sets?: number;
  reps?: string;
  weight?: string;
  rpe?: number;
  completed: boolean;
}

export interface IWorkoutHistory {
  _id?: Types.ObjectId;
  trainerId?: Types.ObjectId;
  date: Date;
  focus?: string;
  exercisesPerformed: IExercisePerformed[];
  sessionRpe?: number;
  durationMinutes?: number;
  notes?: string;
  aiPlanUsed: boolean;
}

// ─────────────────────────────────────────────────────────────
// MAIN USER INTERFACE
// ─────────────────────────────────────────────────────────────

export interface IUser extends Document {
  // ── Existing ──────────────────────────────────────────────
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth?: string;
  password: string;
  gender: TGender;
  role: TRole;
  profilePicture?: string;
  bio?: string;
  isVerified: boolean;
  isDeleted: boolean;

  // ── New: Fitness Profile ──────────────────────────────────
  height?: number; // cm
  weight?: number; // kg
  fitnessLevel?: TFitnessLevel;
  injuries: string[];
  availableEquipment?: TEquipment;
  trainingDaysPerWeek?: number;

  // ── New: Goal ─────────────────────────────────────────────
  primaryGoal?: TGoal;

  // ── New: Trainer Subscription ─────────────────────────────
  subscribedTrainer?: Types.ObjectId;
  subscriptionTier: TSubscriptionTier;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;

  // ── New: AI Memory ────────────────────────────────────────
  memory: IUserMemory[];

  // ── New: Workout History ──────────────────────────────────
  workoutHistory: IWorkoutHistory[];

  // ── New: Onboarding ───────────────────────────────────────
  onboardingCompleted: boolean;

  // ── Instance method ───────────────────────────────────────
  getMemoryForTrainer(trainerId: string): IUserMemory | undefined;

  // ── Timestamps (auto by mongoose) ─────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────
// OTP (unchanged)
// ─────────────────────────────────────────────────────────────

export interface IOTP {
  email: string;
  otp: string;
  expiresAt: Date;
}
