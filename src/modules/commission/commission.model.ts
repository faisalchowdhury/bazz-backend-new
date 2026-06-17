import mongoose, { Schema } from "mongoose";
import { ICommission } from "./commission.interface";

const commissionSchema = new Schema<ICommission>(
  {
    // Only one document exists in this collection
    // Admin updates it via PATCH — upserted every time
    platformCommissionPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 20, // platform default: 20%
    },

    updatedByAdminId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export const CommissionModel =
  (mongoose.models.Commission as mongoose.Model<ICommission>) ||
  mongoose.model<ICommission>("Commission", commissionSchema);
