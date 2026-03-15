import mongoose, { Schema } from "mongoose";
import { IServicePrice } from "./servicePrice.interface";

const servicePriceSchema = new Schema<IServicePrice>({
  trainerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  monthlyPrice: {
    type: Number,
    required: true,
  },
  yearlyPrice: {
    type: Number,
    required: true,
  },
});
