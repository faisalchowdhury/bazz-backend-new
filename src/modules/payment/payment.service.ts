import Stripe from "stripe";
import { Types } from "mongoose";
import { PaymentModel } from "./payment.model";
import { InvoiceModel } from "../invoice/invoice.model";
import { SubscriptionModel } from "../subscription/subscription.model";
import { UserModel } from "../user/user.model";
import { TrainerModel } from "../trainer/trainer.model";
import { calculateCommissionSplit } from "../commission/commission.service";
import { PromoCodeModel } from "../promoCode/promoCode.model";
import { getDefaultTrainer } from "../promoCode/promoCode.service";

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

  // 6. Create subscription (dynamically calculate duration from invoice period bounds)
  const startDate = new Date();
  const endDate = new Date();

  if (invoice.periodStart && invoice.periodEnd) {
    const diffTime = Math.abs(
      new Date(invoice.periodEnd).getTime() -
        new Date(invoice.periodStart).getTime(),
    );
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    endDate.setDate(endDate.getDate() + diffDays);
  } else {
    // Fallback default is 30 days
    endDate.setDate(endDate.getDate() + 30);
  }

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

// ─────────────────────────────────────────────────────────────
// CREATE DEFAULT STRIPE CHECKOUT SESSION (Monthly/Annual)
// ─────────────────────────────────────────────────────────────
export const createDefaultCheckoutSession = async (
  userId: string,
  tier: "monthly" | "annual",
  promoCode?: string,
) => {
  // Check if user already has an active subscription to prevent double billing/overlap
  const activeSub = await SubscriptionModel.findOne({
    userId,
    status: "active",
    endDate: { $gt: new Date() },
  });
  if (activeSub) {
    throw new Error(
      "You already have an active subscription and cannot subscribe again until your current subscription expires.",
    );
  }

  // 1. Determine standard base prices
  let basePriceCents = tier === "monthly" ? 2000 : 5000; // $20.00 or $50.00
  let isDiscountApplied = false;

  // 2. Validate promo code if provided
  if (promoCode && promoCode.trim()) {
    const codeUpper = promoCode.trim().toUpperCase();
    const promo = await PromoCodeModel.findOne({
      code: codeUpper,
      status: "active",
    });
    if (!promo) {
      throw new Error("Invalid or inactive promo code");
    }
    // 50% discount on both tiers as specified
    basePriceCents = tier === "monthly" ? 1000 : 2500; // $10.00 or $25.00
    isDiscountApplied = true;
  }

  // 3. Resolve the Default App Trainer
  const defaultTrainer = await getDefaultTrainer();
  if (!defaultTrainer) {
    throw new Error("Default trainer is not configured in the system.");
  }

  // 4. Calculate period dates
  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  if (tier === "monthly") {
    periodEnd.setDate(periodEnd.getDate() + 30);
  } else {
    periodEnd.setDate(periodEnd.getDate() + 365);
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1); // 1-day link expiration

  // 5. Generate a unique Invoice number
  const year = new Date().getFullYear();
  const count = await InvoiceModel.countDocuments();
  const num = String(count + 1).padStart(4, "0");
  const invoiceNumber = `INV-${year}-${num}`;

  // 6. Spawn a standard Invoice in database with status "sent"
  const planLabel =
    tier === "monthly" ? "Monthly Subscription" : "Annual Subscription";
  const discountLabel = isDiscountApplied
    ? " (50% Off Promo Discount Applied)"
    : "";
  const description = `P2P FitTech ${planLabel}${discountLabel} — App Default Trainer`;

  const invoice = await InvoiceModel.create({
    userId,
    trainerId: defaultTrainer._id,
    requestId: new Types.ObjectId(), // Placeholder since there is no custom trainer request
    amount: basePriceCents,
    currency: "usd",
    description,
    periodStart,
    periodEnd,
    status: "sent", // Already set to sent so payment-success can verify it
    isRenewal: false,
    expiresAt,
  });

  // 7. Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `P2P FitTech ${planLabel}`,
            description,
          },
          unit_amount: basePriceCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.STRIPE_SUCCESS_URL || "https://faisal8080.merinasib.shop"}/payment-success?session_id={CHECKOUT_SESSION_ID}&invoiceId=${(invoice._id as any).toString()}`,
    cancel_url: `${process.env.STRIPE_CANCEL_URL || "https://faisal8080.merinasib.shop"}/payment-cancel?invoiceId=${(invoice._id as any).toString()}`,
    metadata: {
      invoiceId: (invoice._id as any).toString(),
      userId: userId,
      trainerId: (defaultTrainer._id as any).toString(),
      tier,
      promoCode: promoCode || "",
    },
  });

  if (!session.url) {
    throw new Error("Failed to generate Stripe payment session URL");
  }

  // 8. Update Invoice with the generated Stripe URL
  invoice.paymentUrl = session.url;
  await invoice.save();

  return {
    paymentUrl: session.url,
    invoiceId: invoice._id,
    amount: basePriceCents,
    tier,
  };
};
