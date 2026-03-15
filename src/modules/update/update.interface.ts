import { Types } from "mongoose";

export interface IUpdate {
  trainerUserId: Types.ObjectId;
  location: string;
  description: string;
  upload: string;
}
