import Stripe from "stripe";
import { Types } from "mongoose";
import { PaymentModel } from "./payment.model";

import { UserModel } from "../user/user.model";
import { TrainerModel } from "../trainer/trainer.model";
import { InvoiceModel } from "../invoice/invoice.model";
import { SubscriptionModel } from "../subscription/subscription.model";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

// ─────────────────────────────────────────────────────────────
// HELPER — INIT TRAINER MEMORY FOR USER
// Called after payment is verified
// Creates the memory entry for this trainer if not already exists
// This is what was previously done in onboarding — now moved here
// ─────────────────────────────────────────────────────────────

const initTrainerMemory = async (userId: string, trainerId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) return;

  // Check if memory already exists for this trainer
  const memoryExists = user.memory?.find(
    (m: any) => m.trainerId.toString() === trainerId,
  );
  if (memoryExists) return; // already initialized — skip

  // Build initial profile memory from user's profile
  const profileMemory = {
    goal: user.primaryGoal,
    experienceLevel: user.fitnessLevel,
    scheduleDaysPerWeek: user.trainingDaysPerWeek,
    equipment: user.availableEquipment,
    limitations: user.injuries?.join(", ") || "none",
    preferences: "",
    motivationStyle: "balanced",
    updatedAt: new Date(),
  };

  await UserModel.findByIdAndUpdate(userId, {
    $push: {
      memory: {
        trainerId,
        profileMemory,
        rollingMemory: {
          last3Sessions: [],
          lastKnownLoads: {},
          adherenceNotes: "",
          recoveryNotes: "",
          flags: [],
          updatedAt: new Date(),
        },
        lastUpdatedAt: new Date(),
      },
    },
  });
};

// ─────────────────────────────────────────────────────────────
// VERIFY PAYMENT
// Flutter sends transactionId after payment
// Backend verifies with Stripe → grants access + inits memory
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

  // 3. Verify with Stripe or other gateway
  let gatewayResponse: any = null;
  let verificationPassed = false;

  if (gateway === "stripe") {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(transactionId);

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
    // bkash / nagad / other
    // TODO: add their verification logic when needed
    // For now trust the transactionId from Flutter
    verificationPassed = true;
  }

  // 4. If verification failed — save failed record and throw
  if (!verificationPassed) {
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

  // 5. Create subscription (30 days from today)
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const subscription = await SubscriptionModel.create({
    userId,
    trainerId: invoice.trainerId,
    invoiceId: invoice._id,
    paymentId: new Types.ObjectId(), // placeholder updated below
    status: "active",
    startDate,
    endDate,
    reminderSent7Days: false,
    reminderSent3Days: false,
    reminderSent1Day: false,
  });

  // 6. Save verified payment
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

  // 7. Update subscription with real paymentId
  subscription.paymentId = payment._id as Types.ObjectId;
  await subscription.save();

  // 8. Mark invoice as paid
  invoice.status = "paid";
  invoice.paidAt = new Date();
  await invoice.save();

  // 9. Grant user access
  // Sets subscribedTrainer + subscriptionTier on user model
  // This is the ONLY place these fields are set — not in onboarding
  await UserModel.findByIdAndUpdate(userId, {
    $set: {
      subscribedTrainer: invoice.trainerId,
      subscriptionTier: "paid",
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
    },
  });

  // 10. Initialize trainer memory for this user
  // Moved here from onboarding — memory is created only after payment
  // so it's tied to the actual trainer the user subscribed to
  await initTrainerMemory(userId, invoice.trainerId.toString());

  // 11. Load trainer name for response
  const trainer = await TrainerModel.findById(invoice.trainerId)
    .select("name specialty")
    .lean();

  return {
    payment,
    subscription,
    invoice,
    access: {
      granted: true,
      startDate,
      endDate,
      trainerId: invoice.trainerId,
      trainerName: (trainer as any)?.name,
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
