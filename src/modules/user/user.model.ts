import mongoose, { Schema } from "mongoose";
import {
  IUser,
  IOTP,
  IUserMemory,
  ISessionSummary,
  IWorkoutHistory,
} from "./user.interface";

// ─────────────────────────────────────────────────────────────
// SUB-SCHEMAS
// ─────────────────────────────────────────────────────────────

const sessionSummarySchema = new Schema<ISessionSummary>(
  {
    date: { type: Date, default: Date.now },
    workoutSummary: { type: String },
    exercisesCompleted: [{ type: String }],
    loadsUsed: { type: Schema.Types.Mixed, default: {} }, // e.g. { "Bench Press": "135lb x 3x8" }
    adherence: {
      type: String,
      enum: ["completed", "skipped", "modified"],
      default: "completed",
    },
    rpe: { type: Number, min: 1, max: 10 },
    painNotes: { type: String },
    sleepStressRating: { type: Number, min: 1, max: 10 },
    energyLevel: { type: Number, min: 1, max: 10 },
    nextSessionPrescribed: { type: String },
    flags: [{ type: String }], // e.g. ["pain_flag", "low_adherence"]
  },
  { _id: true },
);

const userMemorySchema = new Schema<IUserMemory>(
  {
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: "Trainer",
      required: true,
    },

    // Stable — updated occasionally
    profileMemory: {
      preferredName: { type: String },
      goal: {
        type: String,
        enum: ["maintain_physique", "muscle_gain", "weight_loss", "boxing"],
      },
      experienceLevel: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
      },
      scheduleDaysPerWeek: { type: Number },
      equipment: { type: String }, // e.g. "full gym", "home only"
      limitations: { type: String }, // self-reported injuries
      preferences: { type: String }, // e.g. "morning workouts, no leg press"
      motivationStyle: {
        type: String,
        enum: ["tough_love", "gentle", "balanced"],
        default: "balanced",
      },
      updatedAt: { type: Date, default: Date.now },
    },

    // Rolling — updated after every session (keep last 3)
    rollingMemory: {
      last3Sessions: [sessionSummarySchema],
      lastKnownLoads: { type: Schema.Types.Mixed, default: {} }, // { "Squat": "185lb" }
      adherenceNotes: { type: String },
      recoveryNotes: { type: String },
      flags: [{ type: String }],
      updatedAt: { type: Date, default: Date.now },
    },

    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const workoutHistorySchema = new Schema<IWorkoutHistory>(
  {
    trainerId: { type: Schema.Types.ObjectId, ref: "Trainer" },
    date: { type: Date, default: Date.now },
    focus: { type: String }, // e.g. "Upper Body", "Legs"
    exercisesPerformed: [
      {
        exerciseId: { type: Schema.Types.ObjectId },
        exerciseName: { type: String },
        blockName: { type: String },
        sets: { type: Number },
        reps: { type: String },
        weight: { type: String },
        rpe: { type: Number },
        completed: { type: Boolean, default: true },
      },
    ],
    sessionRpe: { type: Number, min: 1, max: 10 },
    durationMinutes: { type: Number },
    notes: { type: String },
    aiPlanUsed: { type: Boolean, default: false },
  },
  { _id: true },
);

// ─────────────────────────────────────────────────────────────
// MAIN USER SCHEMA
// ─────────────────────────────────────────────────────────────

const userSchema = new Schema<IUser>(
  {
    // ── Existing fields (unchanged) ───────────────────────────
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    dateOfBirth: { type: String, required: false },
    password: { type: String, required: true },
    gender: {
      type: String,
      enum: ["male", "female", "not_prefer_to_say"],
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "user", "trainer"],
      default: "user",
    },
    profilePicture: { type: String, required: false },
    bio: { type: String, required: false },
    isVerified: { type: Boolean, required: true, default: false },
    isDeleted: { type: Boolean, required: true, default: false },

    // ── NEW: Fitness Profile ──────────────────────────────────
    height: { type: Number, required: false }, // cm
    weight: { type: Number, required: false }, // kg
    fitnessLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: false,
    },
    injuries: [{ type: String }], // self-reported, e.g. ["bad knees", "lower back"]
    availableEquipment: { type: String }, // "full_gym" | "home_only" | "hotel_gym" | "no_equipment"
    trainingDaysPerWeek: { type: Number, min: 1, max: 7 },

    // ── NEW: Goal ─────────────────────────────────────────────
    primaryGoal: {
      type: String,
      enum: ["maintain_physique", "muscle_gain", "weight_loss", "boxing"],
      required: false,
    },

    // ── NEW: Trainer Subscription ─────────────────────────────
    subscribedTrainer: {
      type: Schema.Types.ObjectId,
      ref: "Trainer",
      required: false,
    },
    subscriptionTier: {
      type: String,
      enum: ["free", "paid", "premium"],
      default: "free",
    },
    subscriptionStartDate: { type: Date, required: false },
    subscriptionEndDate: { type: Date, required: false },

    // ── NEW: AI Memory (one entry per trainer subscribed to) ──
    memory: [userMemorySchema],

    // ── NEW: Workout History ──────────────────────────────────
    workoutHistory: [workoutHistorySchema],

    // ── NEW: Onboarding ───────────────────────────────────────
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ─────────────────────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────────────────────

// Get memory object for a specific trainer
userSchema.methods.getMemoryForTrainer = function (trainerId: string) {
  return this.memory.find(
    (m: IUserMemory) => m.trainerId.toString() === trainerId.toString(),
  );
};

// ─────────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────────

userSchema.index({ subscribedTrainer: 1 });
userSchema.index({ primaryGoal: 1 });
userSchema.index({ "memory.trainerId": 1 });

// ─────────────────────────────────────────────────────────────
// MODELS
// ─────────────────────────────────────────────────────────────

export const UserModel = mongoose.model<IUser>("User", userSchema);

// ─────────────────────────────────────────────────────────────
// OTP (unchanged)
// ─────────────────────────────────────────────────────────────

const OTPSchema = new Schema<IOTP>({
  email: { type: String, required: true, trim: true, index: true },
  otp: { type: String, required: true, trim: true },
  expiresAt: { type: Date, required: true, index: { expires: "1m" } },
});

export const OTPModel = mongoose.model<IOTP>("OTP", OTPSchema);
OTPSchema.index({ email: 1, expiresAt: 1 });
