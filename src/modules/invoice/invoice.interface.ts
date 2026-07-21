import { Document, Types } from "mongoose";

export type TInvoiceStatus = "draft" | "sent" | "paid" | "expired";

export interface IInvoice extends Document {
  userId: Types.ObjectId; // ref → User
  trainerId: Types.ObjectId; // ref → Trainer
  requestId: Types.ObjectId; // ref → TrainerRequest

  // Amount trainer sets (their own price)
  amount: number; // in cents e.g. 2900 = $29.00
  currency: string; // "usd"

  // Invoice details
  description: string; // "1 Month Personal Training — Gabriel Rowling"

  // Subscription period this invoice covers
  periodStart: Date;
  periodEnd: Date; // periodStart + 30 days

  status: TInvoiceStatus;

  // PDF stored on cloud (S3 / Cloudinary)
  pdfUrl?: string;

  // Stripe hosted payment session URL
  paymentUrl?: string;

  // Renewal tracking
  isRenewal: boolean;
  previousInvoiceId?: Types.ObjectId;

  // Tracking dates
  sentAt?: Date; // when trainer clicked "Send Invoice"
  paidAt?: Date; // when payment confirmed
  expiresAt: Date; // invoice expires if not paid (sentAt + 7 days)

  createdAt: Date;
  updatedAt: Date;
}
