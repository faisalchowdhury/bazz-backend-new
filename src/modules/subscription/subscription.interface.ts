import { Document, Types } from "mongoose";

export type TSubscriptionStatus = "active" | "expired" | "cancelled";
export type TSubscriptionSource = "trainer_invoice" | "promo";

export interface ISubscription extends Document {
  userId: Types.ObjectId; // ref → User
  trainerId: Types.ObjectId; // ref → Trainer
  invoiceId?: Types.ObjectId; // latest paid invoice (trainer flow only)
  paymentId?: Types.ObjectId; // latest verified payment (trainer flow only)

  // How this subscription was created
  source: TSubscriptionSource;
  promoCodeId?: Types.ObjectId; // ref → PromoCode (promo flow only)

  status: TSubscriptionStatus;

  startDate: Date;
  endDate: Date; // startDate + 30 days

  // Renewal notification tracking
  // Prevents sending duplicate reminders
  reminderSent7Days: boolean;
  reminderSent3Days: boolean;
  reminderSent1Day: boolean;

  cancelledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
