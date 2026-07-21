import mongoose, { Schema } from "mongoose";
import { IInvoice } from "./invoice.interface";

const invoiceSchema = new Schema<IInvoice>(
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
      index: true,
    },
    requestId: {
      type: Schema.Types.ObjectId,
      ref: "TrainerRequest",
      required: true,
    },

    amount: { type: Number, required: true }, // in cents
    currency: { type: String, default: "usd" },
    description: { type: String, required: true },

    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },

    status: {
      type: String,
      enum: ["draft", "sent", "paid", "expired"],
      default: "draft",
    },

    pdfUrl: { type: String },
    paymentUrl: { type: String },

    isRenewal: { type: Boolean, default: false },
    previousInvoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },

    sentAt: { type: Date },
    paidAt: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

invoiceSchema.index({ userId: 1, status: 1 });
invoiceSchema.index({ trainerId: 1, status: 1 });

export const InvoiceModel = mongoose.model<IInvoice>("Invoice", invoiceSchema);
