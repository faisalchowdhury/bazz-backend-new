import mongoose, { Schema, Document, Types } from "mongoose";

export interface IWorkoutStats extends Document {
  userId: Types.ObjectId;
  workoutId: Types.ObjectId;
  date: Date;
  goal: string[];
  focusArea: string[];
  duration: number;
  workout_intensity: string[];
  equipment_availablity: string[];
  workout_environment: string[];
  totalExercises: number;
  completedExercises: number;
  completionPercentage: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutStatsSchema = new Schema<IWorkoutStats>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    workoutId: {
      type: Schema.Types.ObjectId,
      ref: "Workout",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    goal: { type: [String], default: [] },
    focusArea: { type: [String], default: [] },
    duration: { type: Number, default: 0 },
    workout_intensity: { type: [String], default: [] },
    equipment_availablity: { type: [String], default: [] },
    workout_environment: { type: [String], default: [] },
    totalExercises: { type: Number, default: 0 },
    completedExercises: { type: Number, default: 0 },
    completionPercentage: { type: Number, default: 0 },
    status: { type: String, default: "completed" },
  },
  {
    timestamps: true,
  },
);

// Ensure unique statistics entry per user per workout
WorkoutStatsSchema.index({ userId: 1, workoutId: 1 }, { unique: true });
// Ensure easy date querying
WorkoutStatsSchema.index({ userId: 1, date: -1 });

export const WorkoutStatsModel =
  (mongoose.models.WorkoutStats as mongoose.Model<IWorkoutStats>) ||
  mongoose.model<IWorkoutStats>("WorkoutStats", WorkoutStatsSchema);
