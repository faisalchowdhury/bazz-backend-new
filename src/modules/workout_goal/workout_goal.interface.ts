import { Types } from "mongoose";

export interface IWorkout extends Document {
  userId: Types.ObjectId;
  goal: string[];
  focusArea: string[];
  workout_environment: string[];
  equipment_availablity: string[];
  workout_intensity: string[];
  duration: number;
  date: Date;
}
