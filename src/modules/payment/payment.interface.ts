import { Document, Types } from "mongoose";

export type TPaymentStatus = "pending" | "verified" | "failed";
export type TPaymentGateway = "stripe" | "bkash" | "nagad" | "other";

export interface IPayment extends Document {
  userId: Types.ObjectId; // ref → User
  trainerId: Types.ObjectId; // ref → Trainer
  invoiceId: Types.ObjectId; // ref → Invoice
  subscriptionId: Types.ObjectId; // ref → Subscription

  // Flutter sends these after payment
  transactionId: string;
  amount: number; // full invoice amount in cents
  currency: string;
  gateway: TPaymentGateway;

  status: TPaymentStatus;

  // ── Commission split (stored at verification time) ────────
  // Snapshot of what platform takes and what trainer earns
  // Stored here so historical records are accurate even if
  // commission rate changes later
  commissionPercent: number; // platform % at time of payment e.g. 20
  platformAmountCents: number; // what platform earned e.g. 580
  trainerAmountCents: number; // what trainer earns  e.g. 2320

  // Set when backend verifies with Stripe
  verifiedAt?: Date;
  gatewayResponse?: any;

  createdAt: Date;
  updatedAt: Date;
}
