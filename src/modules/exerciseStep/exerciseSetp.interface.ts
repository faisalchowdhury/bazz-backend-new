import { Document, Types } from "mongoose";

export interface IExerciseStep extends Document {
  exerciseId: Types.ObjectId; // ref → Exercise

  order: number;
  instruction: string;
  duration?: string;
  tip?: string;

  createdAt: Date;
  updatedAt: Date;
}
