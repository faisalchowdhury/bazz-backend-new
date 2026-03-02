import { Types } from "mongoose";

export interface IService {
  trainerUserId: Types.ObjectId;
  name: string;
  description: string;
  image?: string;
  minPrice: number;
  maxPrice: number;
}
