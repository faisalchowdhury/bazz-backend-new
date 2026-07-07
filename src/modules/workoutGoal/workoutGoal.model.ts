import mongoose, { Schema } from "mongoose";
import { IWorkout } from "./workoutGoal.interface";

// ─────────────────────────────────────────────────────────────
// SUB-SCHEMAS
// ─────────────────────────────────────────────────────────────

const plannedExerciseStepSchema = new Schema(
  {
    order: { type: Number, required: true },
    instruction: { type: String, required: true },
    tip: { type: String },
    duration: { type: String },
  },
  { _id: false },
);

const plannedSubstitutionsSchema = new Schema(
  {
    noBarbell: { type: String },
    noMachine: { type: String },
    homeOnly: { type: String },
    hotelGym: { type: String },
  },
  { _id: false },
);

// Single exercise AI picked from Exercise + ExerciseBlock collections
// Full data is snapshotted here — workout stays self-contained
const plannedExerciseSchema = new Schema(
  {
    // References to separate collections
    exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise" },
    blockId: { type: Schema.Types.ObjectId, ref: "ExerciseBlock" },
    blockName: { type: String },
    exerciseName: { type: String, required: true },
    muscleGroup: { type: String },

    // Prescription snapshotted from Exercise doc
    sets: { type: Number, required: true },
    reps: { type: String, required: true },
    restTime: { type: String, default: "60s" },
    rpe: { type: String },

    // Steps snapshotted from ExerciseStep collection
    steps: [plannedExerciseStepSchema],

    // Substitutions snapshotted from Exercise doc
    substitutions: { type: plannedSubstitutionsSchema },

    // Position in today's session
    order: { type: Number, required: true },

    // Completion tracking — filled by user
    isCompleted: { type: Boolean, default: false },
    completedSets: { type: Number },
    actualWeight: { type: String },
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

// Full AI generated plan — null until user hits "Generate"
const aiGeneratedPlanSchema = new Schema(
  {
    coachNote: { type: String },
    thisWeekFocus: [{ type: String }],
    nutritionTip: { type: String },

    warmUp: [sessionStepSchema],
    mainWork: [plannedExerciseSchema],
    accessories: [plannedExerciseSchema],
    finisher: [plannedExerciseSchema],
    coolDown: [sessionStepSchema],

    estimatedDurationMinutes: { type: Number },
    cardioGuidance: { type: String },
    suggestedVideo: { type: String },

    checkInQuestion: { type: String },
    checkInResponse: { type: String },
    checkInRespondedAt: { type: Date },

    generatedAt: { type: Date, default: Date.now },
    trainerPersona: { type: String },
    trainerSpecialty: { type: String },

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
    // ── User input (unchanged) ────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    goal: { type: [String], required: true },
    focusArea: { type: [String], required: true },
    workout_environment: { type: [String], required: true },
    equipment_availablity: { type: [String], required: true },
    workout_intensity: { type: [String], required: true },
    duration: { type: Number, required: true },
    date: { type: Date, required: true },

    // ── Trainer reference (separate collection) ───────────────
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trainer",
      required: false,
    },

    // ── AI generated plan ─────────────────────────────────────
    aiPlan: {
      type: aiGeneratedPlanSchema,
      required: false,
      default: null,
    },

    // ── Session lifecycle ─────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "skipped"],
      default: "pending",
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    actualDurationMinutes: { type: Number },
  },
  { timestamps: true },
);

// ─────────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────────

WorkoutSchema.index({ userId: 1, date: -1 });
WorkoutSchema.index({ userId: 1, status: 1 });
WorkoutSchema.index({ trainerId: 1 });

// ─────────────────────────────────────────────────────────────
// MODEL — guard prevents OverwriteModelError
// ─────────────────────────────────────────────────────────────

export const WorkoutModel =
  (mongoose.models.Workout as mongoose.Model<IWorkout>) ||
  mongoose.model<IWorkout>("Workout", WorkoutSchema);
