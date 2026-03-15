import { Types } from "mongoose";

export interface IStep {
  name: string;
  description?: string;
  time: number; // seconds
}

export interface IWorkout {
  name: string;
  status: "pending" | "completed" | "skipped";
  steps: IStep[];
}

export interface IWorkoutRecord {
  trainerUserId: Types.ObjectId;
  userUserId: Types.ObjectId;
  exerciseBlock: number;
  workouts: IWorkout[];
  date: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
