import { Document, Types } from "mongoose";

export type TWithdrawalStatus =
  | "pending" // trainer submitted, waiting for admin
  | "approved" // admin approved, payment sent manually
  | "rejected" // admin rejected with reason
  | "paid"; // admin confirmed manual payment sent

export type TWithdrawalMethod = "paypal" | "stripe" | "bank_transfer";

export interface IWithdrawal extends Document {
  trainerId: Types.ObjectId; // ref → Trainer

  // Amount trainer wants to withdraw (in cents)
  requestedAmountCents: number;

  // Snapshot of earnings at request time — for audit trail
  totalEarnedCents: number; // all time trainer earnings
  totalWithdrawnCents: number; // previously withdrawn
  availableBalanceCents: number; // totalEarned - totalWithdrawn at request time

  // Commission snapshot for transparency
  commissionPercent: number; // platform commission rate at request time

  // Payment details trainer provides
  withdrawalMethod: TWithdrawalMethod;
  paymentEmail: string; // PayPal or Stripe email
  additionalNote?: string; // optional note from trainer

  // Admin actions
  status: TWithdrawalStatus;
  adminNote?: string; // reason for rejection or payment confirmation
  processedByAdminId?: string; // which admin handled it
  processedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
