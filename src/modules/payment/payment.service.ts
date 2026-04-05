import Stripe from "stripe";
import { Types } from "mongoose";
import { PaymentModel } from "./payment.model";

import { UserModel } from "../user/user.model";
import { InvoiceModel } from "../invoice/invoice.model";
import { SubscriptionModel } from "../subscription/subscription.model";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

// ─────────────────────────────────────────────────────────────
// VERIFY PAYMENT
// Flutter sends transactionId after payment
// Backend verifies with Stripe → grants access
// ─────────────────────────────────────────────────────────────

export const verifyPayment = async (
  userId: string,
  invoiceId: string,
  transactionId: string, // Stripe Payment Intent ID from Flutter
  gateway: string,
) => {
  // 1. Find the invoice
  const invoice = await InvoiceModel.findOne({
    _id: invoiceId,
    userId,
    status: "sent",
  });
  if (!invoice) throw new Error("Invoice not found or not in sent status");

  // 2. Check payment not already processed
  const existingPayment = await PaymentModel.findOne({ transactionId });
  if (existingPayment) {
    throw new Error("This transaction has already been processed");
  }

  // 3. Verify with Stripe
  let gatewayResponse: any = null;
  let verificationPassed = false;

  if (gateway === "stripe") {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(transactionId);

      // Check payment intent is for correct amount
      if (
        paymentIntent.status === "succeeded" &&
        paymentIntent.amount === invoice.amount
      ) {
        verificationPassed = true;
        gatewayResponse = paymentIntent;
      } else {
        throw new Error(
          `Stripe verification failed. Status: ${paymentIntent.status}`,
        );
      }
    } catch (err: any) {
      throw new Error(`Stripe verification error: ${err.message}`);
    }
  } else {
    // For other gateways (bkash, nagad etc.)
    // Add their verification logic here when needed
    // For now we trust the transactionId from Flutter
    // TODO: Add bkash/nagad API verification
    verificationPassed = true;
  }

  if (!verificationPassed) {
    // Save failed payment record
    await PaymentModel.create({
      userId,
      trainerId: invoice.trainerId,
      invoiceId,
      subscriptionId: new Types.ObjectId(),
      transactionId,
      amount: invoice.amount,
      currency: invoice.currency,
      gateway,
      status: "failed",
      gatewayResponse,
    });
    throw new Error("Payment verification failed");
  }

  // 4. Create subscription
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const subscription = await SubscriptionModel.create({
    userId,
    trainerId: invoice.trainerId,
    invoiceId: invoice._id,
    paymentId: new Types.ObjectId(), // placeholder, updated below
    status: "active",
    startDate,
    endDate,
    reminderSent7Days: false,
    reminderSent3Days: false,
    reminderSent1Day: false,
  });

  // 5. Save verified payment record
  const payment = await PaymentModel.create({
    userId,
    trainerId: invoice.trainerId,
    invoiceId: invoice._id,
    subscriptionId: subscription._id,
    transactionId,
    amount: invoice.amount,
    currency: invoice.currency,
    gateway,
    status: "verified",
    verifiedAt: new Date(),
    gatewayResponse,
  });

  // 6. Update subscription with real paymentId
  subscription.paymentId = payment._id as Types.ObjectId;
  await subscription.save();

  // 7. Mark invoice as paid
  invoice.status = "paid";
  invoice.paidAt = new Date();
  await invoice.save();

  // 8. Grant user access — update subscribedTrainer on user
  await UserModel.findByIdAndUpdate(userId, {
    $set: {
      subscribedTrainer: invoice.trainerId,
      subscriptionTier: "paid",
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
    },
  });

  return {
    payment,
    subscription,
    invoice,
    access: {
      granted: true,
      startDate,
      endDate,
      trainerId: invoice.trainerId,
    },
  };
};

// ─────────────────────────────────────────────────────────────
// GET MY PAYMENTS (user payment history)
// ─────────────────────────────────────────────────────────────

export const getMyPayments = async (userId: string) => {
  return await PaymentModel.find({ userId, status: "verified" })
    .populate("trainerId", "name specialty profileImage")
    .populate("invoiceId", "description amount periodStart periodEnd pdfUrl")
    .sort({ createdAt: -1 })
    .lean();
};
