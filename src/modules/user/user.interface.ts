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
export type TSubscriptionTier = "free" | "paid" | "premium" | "monthly" | "annual";
export type TSubscriptionType = "default_plan" | "trainer_plan";
export type TAdherence = "completed" | "skipped" | "modified";
export type TMotivationStyle = "tough_love" | "gentle" | "balanced";
export type TEquipment =
  | "full_gym"
  | "home_only"
  | "hotel_gym"
  | "no_equipment";

// ─────────────────────────────────────────────────────────────
// ANAM AI USAGE (new)
// Tracks monthly video call minutes per user
// Resets automatically every 30 days
// ─────────────────────────────────────────────────────────────

export interface IUserAnamAI {
  monthlyMinutesLimit: number; // 250 — platform default
  minutesUsedThisMonth: number; // increments after each call ends
  currentPeriodStart: Date; // when current billing month started
  totalMinutesAllTime: number; // all-time total for analytics
}

// ─────────────────────────────────────────────────────────────
// SESSION SUMMARY (inside rolling memory)
// ─────────────────────────────────────────────────────────────

export interface ISessionSummary {
  _id?: Types.ObjectId;
  date: Date;
  workoutSummary: string;
  exercisesCompleted: string[];
  loadsUsed: Record<string, string>;
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
  lastKnownLoads: Record<string, string>;
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
  // ── Auth & Profile ────────────────────────────────────────
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth?: string;
  password: string;
  gender: TGender;
  role: TRole;
  profilePicture?: string;
  coverPhoto?: string;
  bio?: string;
  isVerified: boolean;
  isDeleted: boolean;
  fcmToken?: string;

  // ── Fitness Profile ───────────────────────────────────────
  height?: number;
  weight?: number;
  fitnessLevel?: TFitnessLevel;
  injuries: string[];
  availableEquipment?: TEquipment;
  trainingDaysPerWeek?: number;

  // ── Goal ─────────────────────────────────────────────────
  primaryGoal?: TGoal;

  // ── Subscription ─────────────────────────────────────────
  subscribedTrainer?: Types.ObjectId;
  subscriptionType?: TSubscriptionType;
  subscriptionTier: TSubscriptionTier;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;

  // ── Anam AI Usage (new) ───────────────────────────────────
  // Tracks monthly video call minutes — resets every 30 days
  anamAI?: IUserAnamAI;

  // ── AI Memory ────────────────────────────────────────────
  memory: IUserMemory[];

  // ── Workout History ───────────────────────────────────────
  workoutHistory: IWorkoutHistory[];

  // ── Onboarding ────────────────────────────────────────────
  onboardingCompleted: boolean;

  // ── Instance Methods ──────────────────────────────────────
  getMemoryForTrainer(trainerId: string): IUserMemory | undefined;

  // ── Timestamps ────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────
// OTP
// ─────────────────────────────────────────────────────────────

export interface IOTP {
  email: string;
  otp: string;
  expiresAt: Date;
}
