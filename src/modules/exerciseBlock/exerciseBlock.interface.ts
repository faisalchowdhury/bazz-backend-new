import { Document, Types } from "mongoose";
import { MuscleGroup } from "../exercise/exercise.interface";

export interface IExerciseBlock extends Document {
  trainerId: Types.ObjectId; // ref → Trainer

  name: string;
  description?: string;
  category: MuscleGroup;

  isAiGenerated: boolean;
  isApproved: boolean;

  createdAt: Date;
  updatedAt: Date;
}
