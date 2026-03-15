import { Types } from "mongoose";

export interface IServicePrice {
  trainerUserId: Types.ObjectId;
  monthlyPrice: number;
  yearlyPrice: number;
}
