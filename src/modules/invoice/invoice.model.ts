import mongoose, { Schema } from "mongoose";
import { IInvoice } from "./invoice.interface";

const ivoiceSchema = new Schema<IInvoice>({
  userUserId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  trainerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  actualPrice: {
    type: Number,
    required: true,
  },
  adjustedPrice: {
    type: Number,
    required: true,
  },
  issuedDate: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ["pending", "paid"],
    default: "pending",
  },
  invoicePath: {
    type: String,
    required: true,
  },
  isSent: {
    type: Boolean,
    required: true,
  },
});
