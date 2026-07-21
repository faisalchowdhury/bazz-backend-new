import { Document, Types } from "mongoose";

export interface IIAPSubscription extends Document {
  userId: Types.ObjectId;
  platform: "ios" | "android";
  productId: "month_1" | "year_1" | string;
  subscriptionTier: "monthly" | "annual";
  purchaseId: string; // unique index (for Google: same as purchaseId / transactionId)
  originalTransactionId?: string; // unique index for iOS (StoreKit 2)
  purchaseToken?: string; // Google Play purchase token
  status: "active" | "expired" | "refunded";
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
