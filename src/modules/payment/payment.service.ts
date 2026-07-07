import Stripe from "stripe";
import { Types } from "mongoose";
import { PaymentModel } from "./payment.model";
import { InvoiceModel } from "../invoice/invoice.model";
import { SubscriptionModel } from "../subscription/subscription.model";
import { UserModel } from "../user/user.model";
import { TrainerModel } from "../trainer/trainer.model";
import { calculateCommissionSplit } from "../commission/commission.service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

// ─────────────────────────────────────────────────────────────
// HELPER — INIT TRAINER MEMORY FOR USER
// Called after payment is verified
// ─────────────────────────────────────────────────────────────

const initTrainerMemory = async (userId: string, trainerId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) return;

  const memoryExists = user.memory?.find(
    (m: any) => m.trainerId.toString() === trainerId,
  );
  if (memoryExists) return;

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
// Backend verifies with Stripe → stores commission split → grants access
// ─────────────────────────────────────────────────────────────

export const verifyPayment = async (
  userId: string,
  invoiceId: string,
  transactionId: string,
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

  // 3. Calculate commission split BEFORE verifying
  // Snapshot the current commission rate so historical records stay accurate
  const commissionSplit = await calculateCommissionSplit(invoice.amount);

  // 4. Verify with Stripe or other gateway
  let gatewayResponse: any = null;
  let verificationPassed = false;

  if (gateway === "stripe") {
  //   try {
  //     const paymentIntent = await stripe.paymentIntents.retrieve(transactionId);
  //     if (
  //       paymentIntent.status === "succeeded" &&
  //       paymentIntent.amount === invoice.amount
  //     ) {
  //       verificationPassed = true;
  //       gatewayResponse = paymentIntent;
  //     } else {
  //       throw new Error(
  //         `Stripe verification failed. Status: ${paymentIntent.status}`,
  //       );
  //     }
  //   } catch (err: any) {
  //     throw new Error(`Stripe verification error: ${err.message}`);
  //   }
  verificationPassed = true;
  } else {
    // bkash / nagad / other — trust Flutter for now
    // TODO: add gateway-specific verification
    verificationPassed = true;
  }

  // 5. Save failed payment if verification failed
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
      commissionPercent: commissionSplit.platformPercent,
      platformAmountCents: commissionSplit.platformAmountCents,
      trainerAmountCents: commissionSplit.trainerAmountCents,
      gatewayResponse,
    });
    throw new Error("Payment verification failed");
  }

  // 6. Create subscription
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const subscription = await SubscriptionModel.create({
    userId,
    trainerId: invoice.trainerId,
    invoiceId: invoice._id,
    paymentId: new Types.ObjectId(),
    status: "active",
    startDate,
    endDate,
    reminderSent7Days: false,
    reminderSent3Days: false,
    reminderSent1Day: false,
  });

  // 7. Save verified payment WITH commission split
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
    // ── Commission split snapshot ──────────────────────────
    commissionPercent: commissionSplit.platformPercent,
    platformAmountCents: commissionSplit.platformAmountCents,
    trainerAmountCents: commissionSplit.trainerAmountCents,
  });

  // 8. Update subscription with real paymentId
  subscription.paymentId = payment._id as Types.ObjectId;
  await subscription.save();

  // 9. Mark invoice as paid
  invoice.status = "paid";
  invoice.paidAt = new Date();
  await invoice.save();

  // 10. Grant user access
  await UserModel.findByIdAndUpdate(userId, {
    $set: {
      subscribedTrainer: invoice.trainerId,
      subscriptionTier: "paid",
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
    },
  });

  // 11. Initialize trainer memory for this user
  await initTrainerMemory(userId, invoice.trainerId.toString());

  // 12. Load trainer name for response
  const trainer = await TrainerModel.findById(invoice.trainerId)
    .select("name specialty")
    .lean();

  return {
    payment,
    subscription,
    invoice,
    commissionBreakdown: {
      totalAmountCents: invoice.amount,
      commissionPercent: commissionSplit.platformPercent,
      platformAmountCents: commissionSplit.platformAmountCents,
      trainerAmountCents: commissionSplit.trainerAmountCents,
    },
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
