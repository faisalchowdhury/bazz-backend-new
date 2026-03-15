import { Types } from "mongoose";

export interface IContent {
  trainerUserId: Types.ObjectId;
  video: string;
  title: string;
  categoryId: Types.ObjectId;
  intensity: string;
  description: string;
}
