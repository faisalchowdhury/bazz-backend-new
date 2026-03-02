import mongoose, { Schema } from "mongoose";
import { IWorkout } from "./workout_goal.interface";

const WorkoutSchema: Schema<IWorkout> = new Schema(
  {
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
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  },
);

export const WorkoutModel = mongoose.model<IWorkout>("Workout", WorkoutSchema);
