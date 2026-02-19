import mongoose from "mongoose";

export enum CommissionType {
  GLOBAL = "GLOBAL",
  INDIVIDUAL = "INDIVIDUAL",
}

const CommissionSchema = new mongoose.Schema({
  commissionType: {
    type: String,
    enum: Object.values(CommissionType),
    default: CommissionType.GLOBAL,
  },
  commissionRate: {
    type: Number,
    required: true,
    default: 10,
  },
});

export const CommissionModel = mongoose.model(
  "CommissionRate",
  CommissionSchema
);
