import mongoose, { Schema } from "mongoose";
import { IExerciseStep } from "./exerciseSetp.interface";

const exerciseStepSchema = new Schema<IExerciseStep>(
  {
    exerciseId: {
      type: Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
      index: true,
    },
    order: { type: Number, required: true },
    instruction: { type: String, required: true },
    duration: { type: String },
    tip: { type: String },
  },
  { timestamps: true },
);

exerciseStepSchema.index({ exerciseId: 1, order: 1 });

export const ExerciseStepModel = mongoose.model<IExerciseStep>(
  "ExerciseStep",
  exerciseStepSchema,
);
