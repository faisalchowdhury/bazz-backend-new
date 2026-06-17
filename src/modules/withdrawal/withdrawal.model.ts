import mongoose, { Schema } from "mongoose";
import { IWithdrawal } from "./withdrawal.interface";

const withdrawalSchema = new Schema<IWithdrawal>(
  {
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: "Trainer",
      required: true,
      index: true,
    },

    requestedAmountCents: { type: Number, required: true },

    // Earnings snapshot at request time
    totalEarnedCents: { type: Number, required: true },
    totalWithdrawnCents: { type: Number, required: true },
    availableBalanceCents: { type: Number, required: true },
    commissionPercent: { type: Number, required: true },

    // Payment details
    withdrawalMethod: {
      type: String,
      enum: ["paypal", "stripe", "bank_transfer"],
      required: true,
    },
    paymentEmail: { type: String, required: true },
    additionalNote: { type: String },

    // Admin fields
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
    },
    adminNote: { type: String },
    processedByAdminId: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

withdrawalSchema.index({ trainerId: 1, status: 1 });
withdrawalSchema.index({ status: 1, createdAt: -1 }); // for admin dashboard

export const WithdrawalModel =
  (mongoose.models.Withdrawal as mongoose.Model<IWithdrawal>) ||
  mongoose.model<IWithdrawal>("Withdrawal", withdrawalSchema);
