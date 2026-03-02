import mongoose, { Types } from "mongoose";
import { IService } from "./service.interface";

const serviceSchema = new mongoose.Schema<IService>({
  trainerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  minPrice: {
    type: Number,
    required: true,
  },
  maxPrice: {
    type: Number,
    required: true,
  },
});

export const ServiceModel = mongoose.model<IService>("Service", serviceSchema);
