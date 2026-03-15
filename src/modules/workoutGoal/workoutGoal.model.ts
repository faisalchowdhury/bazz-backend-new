import mongoose, { Schema } from "mongoose";
import { IWorkout } from "./workoutGoal.interface";

// ─────────────────────────────────────────────────────────────
// SUB-SCHEMAS
// ─────────────────────────────────────────────────────────────

const exerciseStepSchema = new Schema(
  {
    order: { type: Number, required: true },
    instruction: { type: String, required: true },
    tip: { type: String },
    duration: { type: String },
  },
  { _id: false },
);

const substitutionsSchema = new Schema(
  {
    noBarbell: { type: String },
    noMachine: { type: String },
    homeOnly: { type: String },
    hotelGym: { type: String },
  },
  { _id: false },
);

// A single exercise AI picked from trainer's block
const plannedExerciseSchema = new Schema(
  {
    // Reference back to trainer's exercise block
    exerciseId: { type: Schema.Types.ObjectId },
    exerciseName: { type: String, required: true },
    blockId: { type: Schema.Types.ObjectId },
    blockName: { type: String },
    muscleGroup: { type: String },

    // Trainer-defined prescription (copied from block)
    sets: { type: Number, required: true },
    reps: { type: String, required: true }, // "8-12" or "30 seconds"
    restTime: { type: String, default: "60s" },
    rpe: { type: String }, // "7-8"

    // Steps from trainer's exercise block
    steps: [exerciseStepSchema],
    substitutions: { type: substitutionsSchema },

    // Position in today's session
    order: { type: Number, required: true },

    // ── Completion tracking (filled by user during/after session) ──
    isCompleted: { type: Boolean, default: false },
    completedSets: { type: Number },
    actualWeight: { type: String }, // "135lb"
    actualRpe: { type: Number, min: 1, max: 10 },
    notes: { type: String },
  },
  { _id: true },
);

// Warm-up / Cool-down step
const sessionStepSchema = new Schema(
  {
    order: { type: Number, required: true },
    instruction: { type: String, required: true },
    duration: { type: String, required: true },
  },
  { _id: false },
);

// Full AI generated plan block
const aiGeneratedPlanSchema = new Schema(
  {
    // AI coach overview
    coachNote: { type: String },
    thisWeekFocus: [{ type: String }], // max 3 bullets
    nutritionTip: { type: String },

    // Session structure
    warmUp: [sessionStepSchema],
    mainWork: [plannedExerciseSchema],
    accessories: [plannedExerciseSchema],
    finisher: [plannedExerciseSchema],
    coolDown: [sessionStepSchema],

    estimatedDurationMinutes: { type: Number },
    cardioGuidance: { type: String },

    // Check-in
    checkInQuestion: { type: String },
    checkInResponse: { type: String },
    checkInRespondedAt: { type: Date },

    // Generation metadata
    generatedAt: { type: Date, default: Date.now },
    trainerPersona: { type: String }, // "Gabriel Rowling"
    trainerSpecialty: { type: String }, // "maintain_physique"

    // AI context snapshot
    aiContextSnapshot: {
      userGoal: { type: String },
      fitnessLevel: { type: String },
      memoryFlags: [{ type: String }],
      exerciseBlocksUsed: [{ type: String }],
    },
  },
  { _id: false },
);

// ─────────────────────────────────────────────────────────────
// MAIN WORKOUT SCHEMA
// ─────────────────────────────────────────────────────────────

const WorkoutSchema: Schema<IWorkout> = new Schema(
  {
    // ── Existing fields (unchanged) ───────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    goal: {
      type: [String],
      required: true,
    },
    focusArea: {
      type: [String],
      required: true,
    },
    workout_environment: {
      type: [String],
      required: true,
    },
    equipment_availablity: {
      type: [String],
      required: true,
    },
    workout_intensity: {
      type: [String],
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },

    // ── NEW: Trainer reference ────────────────────────────────
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trainer",
      required: false,
    },

    // ── NEW: AI generated plan ────────────────────────────────
    // Null until user hits "Generate Plan" — then AI fills this
    aiPlan: {
      type: aiGeneratedPlanSchema,
      required: false,
      default: null,
    },

    // ── NEW: Session status ───────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "skipped"],
      default: "pending",
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    actualDurationMinutes: { type: Number },
  },
  {
    timestamps: true,
  },
);

// ─────────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────────

WorkoutSchema.index({ userId: 1, date: -1 });
WorkoutSchema.index({ userId: 1, status: 1 });
WorkoutSchema.index({ trainerId: 1 });

// ─────────────────────────────────────────────────────────────
// MODEL
// ─────────────────────────────────────────────────────────────

export const WorkoutModel = mongoose.model<IWorkout>("Workout", WorkoutSchema);
