import mongoose, { Schema } from "mongoose";
import { IIAPSubscription } from "./iap.interface";

const IAPSubscriptionSchema = new Schema<IIAPSubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ["ios", "android"],
      required: true,
    },
    productId: {
      type: String,
      required: true,
    },
    subscriptionTier: {
      type: String,
      enum: ["monthly", "annual"],
      required: true,
    },
    purchaseId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    originalTransactionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    purchaseToken: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "expired", "refunded"],
      default: "active",
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

export const IAPSubscriptionModel =
  (mongoose.models.IAPSubscription as mongoose.Model<IIAPSubscription>) ||
  mongoose.model<IIAPSubscription>("IAPSubscription", IAPSubscriptionSchema);
