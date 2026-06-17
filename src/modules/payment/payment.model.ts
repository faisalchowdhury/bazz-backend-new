import mongoose, { Schema } from "mongoose";
import { IPayment } from "./payment.interface";

const paymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: "Trainer",
      required: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
    },

    transactionId: { type: String, required: true },
    amount: { type: Number, required: true }, // full amount in cents
    currency: { type: String, default: "usd" },
    gateway: {
      type: String,
      enum: ["stripe", "bkash", "nagad", "other"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending",
    },

    // ── Commission split snapshot ─────────────────────────────
    // Saved at verification time — never changes after that
    commissionPercent: { type: Number, default: 0 },
    platformAmountCents: { type: Number, default: 0 },
    trainerAmountCents: { type: Number, default: 0 },

    verifiedAt: { type: Date },
    gatewayResponse: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ trainerId: 1, status: 1 }); // for trainer earnings queries
paymentSchema.index({ transactionId: 1 }, { unique: true });

export const PaymentModel = mongoose.model<IPayment>("Payment", paymentSchema);
