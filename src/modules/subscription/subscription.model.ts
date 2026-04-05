import mongoose, { Schema } from "mongoose";
import { ISubscription } from "./subscription.interface";

const subscriptionSchema = new Schema<ISubscription>(
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
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // Notification tracking — prevents duplicate reminders
    reminderSent7Days: { type: Boolean, default: false },
    reminderSent3Days: { type: Boolean, default: false },
    reminderSent1Day: { type: Boolean, default: false },

    cancelledAt: { type: Date },
  },
  { timestamps: true },
);

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1, status: 1 }); // for cron job queries

export const SubscriptionModel = mongoose.model<ISubscription>(
  "Subscription",
  subscriptionSchema,
);
