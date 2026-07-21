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
    loadsUsed: { type: Schema.Types.Mixed, default: {} },
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
    flags: [{ type: String }],
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
      equipment: { type: String },
      limitations: { type: String },
      preferences: { type: String },
      motivationStyle: {
        type: String,
        enum: ["tough_love", "gentle", "balanced"],
        default: "balanced",
      },
      updatedAt: { type: Date, default: Date.now },
    },
    rollingMemory: {
      last3Sessions: [sessionSummarySchema],
      lastKnownLoads: { type: Schema.Types.Mixed, default: {} },
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
    focus: { type: String },
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
    coverPhoto: { type: String, required: false },
    bio: { type: String, required: false },
    isVerified: { type: Boolean, required: true, default: false },
    isDeleted: { type: Boolean, required: true, default: false },
    fcmToken: { type: String, required: false },

    // ── Fitness Profile ──────────────────────────────────────
    height: { type: Number, required: false },
    weight: { type: Number, required: false },
    fitnessLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: false,
    },
    injuries: [{ type: String }],
    availableEquipment: { type: String },
    trainingDaysPerWeek: { type: Number, min: 1, max: 7 },

    // ── Goal ─────────────────────────────────────────────────
    primaryGoal: {
      type: String,
      enum: ["maintain_physique", "muscle_gain", "weight_loss", "boxing"],
      required: false,
    },

    // ── Trainer Subscription ──────────────────────────────────
    subscribedTrainer: {
      type: Schema.Types.ObjectId,
      ref: "Trainer",
      required: false,
    },
    subscriptionTier: {
      type: String,
      enum: ["free", "paid", "premium", "monthly", "annual"],
      default: "free",
    },
    subscriptionStartDate: { type: Date, required: false },
    subscriptionEndDate: { type: Date, required: false },

    // ── Anam AI Usage (new) ───────────────────────────────────
    // Tracks monthly video call minutes per user
    // Auto-initialized on first call, resets every 30 days
    anamAI: {
      monthlyMinutesLimit: {
        type: Number,
        default: 250, // platform default: 250 min/month
      },
      minutesUsedThisMonth: {
        type: Number,
        default: 0,
      },
      currentPeriodStart: {
        type: Date,
        default: Date.now, // set when user makes first call
      },
      totalMinutesAllTime: {
        type: Number,
        default: 0,
      },
    },

    // ── AI Memory ────────────────────────────────────────────
    memory: [userMemorySchema],

    // ── Workout History ──────────────────────────────────────
    workoutHistory: [workoutHistorySchema],

    // ── Onboarding ───────────────────────────────────────────
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ─────────────────────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────────────────────

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
