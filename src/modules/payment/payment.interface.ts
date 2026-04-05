import { Document, Types } from "mongoose";

export type TPaymentStatus = "pending" | "verified" | "failed";
export type TPaymentGateway = "stripe" | "bkash" | "nagad" | "other";

export interface IPayment extends Document {
  userId: Types.ObjectId; // ref → User
  trainerId: Types.ObjectId; // ref → Trainer
  invoiceId: Types.ObjectId; // ref → Invoice
  subscriptionId: Types.ObjectId; // ref → Subscription

  // Flutter sends these after payment
  transactionId: string; // Stripe Payment Intent ID or gateway tx ID
  amount: number; // in cents
  currency: string;
  gateway: TPaymentGateway;

  status: TPaymentStatus;

  // Set when backend verifies with Stripe
  verifiedAt?: Date;
  gatewayResponse?: any; // raw Stripe response stored for audit

  createdAt: Date;
  updatedAt: Date;
}
