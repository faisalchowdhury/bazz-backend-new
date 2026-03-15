import { Types } from "mongoose";

export interface ITrainerRequest {
  trainerUserId: Types.ObjectId;
  userUserId: Types.ObjectId;
  shortMessage: String;
  status: string;
}
