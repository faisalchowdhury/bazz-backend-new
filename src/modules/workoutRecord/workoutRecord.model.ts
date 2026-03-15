import mongoose, { Schema, Types } from "mongoose";
import { IStep, IWorkout } from "./workoutRecord.interface";

export interface IWorkoutRecord extends Document {
  trainerUserId: Types.ObjectId;
  userUserId: Types.ObjectId;
  exerciseBlock: number;
  workouts: IWorkout[];
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StepSchema = new Schema<IStep>({
  name: { type: String, required: true },
  description: { type: String },
  time: { type: Number, required: true },
});

const WorkoutSchema = new Schema<IWorkout>({
  name: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "completed", "skipped"],
    default: "pending",
  },
  steps: [StepSchema],
});

const WorkoutRecordSchema = new Schema<IWorkoutRecord>(
  {
    trainerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    exerciseBlock: {
      type: Number,
      required: true,
    },
    workouts: [WorkoutSchema],
    date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const WorkoutRecordModel = mongoose.model<IWorkoutRecord>(
  "WorkoutRecord",
  WorkoutRecordSchema,
);
