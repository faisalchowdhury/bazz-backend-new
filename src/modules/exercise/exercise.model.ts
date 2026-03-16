import mongoose, { Schema } from "mongoose";
import { IExercise } from "./exercise.interface";

const exerciseSchema = new Schema<IExercise>(
  {
    blockId: {
      type: Schema.Types.ObjectId,
      ref: "ExerciseBlock",
      required: true,
      index: true,
    },
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: "Trainer",
      required: true,
      index: true,
    },

    name: { type: String, required: true },
    muscleGroup: {
      type: String,
      enum: [
        "upper_body",
        "chest",
        "back",
        "shoulders",
        "arms",
        "lower_body",
        "legs",
        "glutes",
        "core",
        "full_body",
        "cardio",
        "boxing",
      ],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate",
    },
    equipment: { type: String, default: "none" },

    sets: { type: Number, required: true },
    reps: { type: String, required: true },
    restTime: { type: String, default: "60s" },
    rpe: { type: String },

    substitutions: {
      noBarbell: { type: String },
      noMachine: { type: String },
      homeOnly: { type: String },
      hotelGym: { type: String },
    },

    tags: [{ type: String }],
    videoUrl: { type: String },

    isAiGenerated: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

exerciseSchema.index({ blockId: 1, muscleGroup: 1 });
exerciseSchema.index({ trainerId: 1, isApproved: 1 });

export const ExerciseModel = mongoose.model<IExercise>(
  "Exercise",
  exerciseSchema,
);
