import mongoose, { Schema } from "mongoose";
import { IExerciseBlock } from "./exerciseBlock.interface";

const exerciseBlockSchema = new Schema<IExerciseBlock>(
  {
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: "Trainer",
      required: true,
      index: true,
    },

    name: { type: String, required: true },
    description: { type: String },
    category: {
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

    isAiGenerated: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

exerciseBlockSchema.index({ trainerId: 1, category: 1 });
exerciseBlockSchema.index({ trainerId: 1, isApproved: 1 });

export const ExerciseBlockModel = mongoose.model<IExerciseBlock>(
  "ExerciseBlock",
  exerciseBlockSchema,
);
