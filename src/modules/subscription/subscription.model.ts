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
    // Optional — promo / default-trainer subscriptions have no invoice/payment
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: false,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: false,
    },

    // How this subscription was created
    source: {
      type: String,
      enum: ["trainer_invoice", "promo"],
      default: "trainer_invoice",
      index: true,
    },
    promoCodeId: {
      type: Schema.Types.ObjectId,
      ref: "PromoCode",
      required: false,
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
