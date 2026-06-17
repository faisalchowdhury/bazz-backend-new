import { Types } from "mongoose";
import { PromoCodeModel, PromoRedemptionModel } from "./promoCode.model";
import { TPromoType } from "./promoCode.interface";
import { TrainerModel } from "../trainer/trainer.model";
import { UserModel } from "../user/user.model";
import { SubscriptionModel } from "../subscription/subscription.model";

// ─────────────────────────────────────────────────────────────
// PLAN DEFAULTS BY TYPE
// Used when importing codes (each code stores its own snapshot,
// so these can be overridden per batch).
// ─────────────────────────────────────────────────────────────

export const PROMO_PLAN_DEFAULTS: Record<
  TPromoType,
  { priceCents: number; durationDays: number; label: string }
> = {
  website: {
    priceCents: 1999, // $19.99
    durationDays: 90, // 3 months
    label: "Website 3-Month Plan",
  },
  affiliate: {
    priceCents: 999, // $9.99
    durationDays: 30, // 1 month
    label: "Affiliate Monthly Plan",
  },
};

// ─────────────────────────────────────────────────────────────
// HELPER — RESOLVE DEFAULT APP TRAINER
// Promo subscriptions grant access to the single "default" trainer.
// Looks for Trainer.isDefault === true, falls back to env id.
// ─────────────────────────────────────────────────────────────

export const getDefaultTrainer = async () => {
  let trainer = await TrainerModel.findOne({ isDefault: true });

  if (!trainer && process.env.DEFAULT_TRAINER_ID) {
    trainer = await TrainerModel.findById(process.env.DEFAULT_TRAINER_ID);
  }

  if (!trainer) {
    throw new Error(
      "No default trainer configured. Set one via POST /promo/default-trainer or DEFAULT_TRAINER_ID env.",
    );
  }
  return trainer;
};

// ─────────────────────────────────────────────────────────────
// HELPER — INIT TRAINER MEMORY FOR USER
// Mirrors payment.service so promo users get the same AI memory seed.
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
// VALIDATE PROMO CODE
// Called when the user enters a code at checkout (before purchase).
// Returns the plan the code unlocks so the app can show the right
// RevenueCat product / price. Does NOT consume the code.
// ─────────────────────────────────────────────────────────────

export const validatePromoCode = async (rawCode: string) => {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) throw new Error("Promo code is required");

  const promo = await PromoCodeModel.findOne({ code });
  if (!promo) throw new Error("Invalid promo code");

  if (promo.status === "disabled") {
    throw new Error("This promo code has been disabled");
  }
  if (promo.usedCount >= promo.maxUses || promo.status === "redeemed") {
    throw new Error("This promo code has already been used");
  }

  return {
    valid: true,
    code: promo.code,
    type: promo.type,
    priceCents: promo.priceCents,
    durationDays: promo.durationDays,
    label: promo.label,
    revenueCatProductId: promo.revenueCatProductId,
  };
};

// ─────────────────────────────────────────────────────────────
// REDEEM PROMO CODE
// Called AFTER the RevenueCat purchase completes on the frontend.
// Consumes the code + grants default-trainer access for the plan
// duration. Logs the redemption for affiliate reporting.
// ─────────────────────────────────────────────────────────────

export const redeemPromoCode = async (
  userId: string,
  rawCode: string,
  opts: {
    revenueCatTransactionId?: string;
    revenueCatProductId?: string;
  } = {},
) => {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) throw new Error("Promo code is required");

  // 1. Atomically claim the code (prevents double-redemption races)
  const promo = await PromoCodeModel.findOneAndUpdate(
    {
      code,
      status: "active",
      $expr: { $lt: ["$usedCount", "$maxUses"] },
    },
    { $inc: { usedCount: 1 } },
    { new: true },
  );

  if (!promo) {
    // Distinguish "doesn't exist" from "already used/disabled"
    const exists = await PromoCodeModel.findOne({ code }).lean();
    if (!exists) throw new Error("Invalid promo code");
    if (exists.status === "disabled")
      throw new Error("This promo code has been disabled");
    throw new Error("This promo code has already been used");
  }

  // 2. Block stacking on an already-active subscription
  const activeSub = await SubscriptionModel.findOne({
    userId,
    status: "active",
  });
  if (activeSub) {
    // roll back the claim we just made
    await PromoCodeModel.updateOne({ _id: promo._id }, { $inc: { usedCount: -1 } });
    throw new Error("You already have an active subscription");
  }

  // 3. Resolve the default app trainer
  let trainer;
  try {
    trainer = await getDefaultTrainer();
  } catch (err) {
    await PromoCodeModel.updateOne({ _id: promo._id }, { $inc: { usedCount: -1 } });
    throw err;
  }

  // 4. Grant access — subscription on the default trainer
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + promo.durationDays);

  const subscription = await SubscriptionModel.create({
    userId,
    trainerId: trainer._id,
    status: "active",
    startDate,
    endDate,
    source: "promo",
    promoCodeId: promo._id,
    reminderSent7Days: false,
    reminderSent3Days: false,
    reminderSent1Day: false,
  });

  // 5. Update user access fields (same as paid trainer flow)
  await UserModel.findByIdAndUpdate(userId, {
    $set: {
      subscribedTrainer: trainer._id,
      subscriptionTier: "paid",
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
    },
  });

  // 6. Seed AI memory for the default trainer
  await initTrainerMemory(userId, (trainer._id as Types.ObjectId).toString());

  // 7. Mark code redeemed (when fully consumed) + stamp redeemer
  const fullyUsed = promo.usedCount >= promo.maxUses;
  await PromoCodeModel.updateOne(
    { _id: promo._id },
    {
      $set: {
        redeemedByUserId: userId,
        redeemedAt: new Date(),
        ...(fullyUsed ? { status: "redeemed" } : {}),
      },
    },
  );

  // 8. Log redemption for affiliate reporting
  await PromoRedemptionModel.create({
    promoCodeId: promo._id,
    code: promo.code,
    type: promo.type,
    userId,
    subscriptionId: subscription._id,
    priceCents: promo.priceCents,
    durationDays: promo.durationDays,
    revenueCatTransactionId: opts.revenueCatTransactionId,
    revenueCatProductId: opts.revenueCatProductId,
  });

  return {
    subscription,
    plan: {
      type: promo.type,
      priceCents: promo.priceCents,
      durationDays: promo.durationDays,
      label: promo.label,
    },
    access: {
      granted: true,
      startDate,
      endDate,
      trainerId: trainer._id,
      trainerName: (trainer as any).name,
    },
  };
};

// ─────────────────────────────────────────────────────────────
// BULK IMPORT CODES (admin)
// Insert a batch of pre-generated codes for one type.
// ordered:false → duplicates are skipped, the rest still insert.
// NOTE: express.json() limit is 100kb — import in batches
// (~5,000 codes per request) or raise the body limit.
// ─────────────────────────────────────────────────────────────

export const bulkImportCodes = async (
  type: TPromoType,
  codes: string[],
  overrides: {
    priceCents?: number;
    durationDays?: number;
    label?: string;
    revenueCatProductId?: string;
    maxUses?: number;
    batchId?: string;
  } = {},
) => {
  if (!["website", "affiliate"].includes(type)) {
    throw new Error("type must be 'website' or 'affiliate'");
  }
  if (!Array.isArray(codes) || codes.length === 0) {
    throw new Error("codes must be a non-empty array");
  }

  const defaults = PROMO_PLAN_DEFAULTS[type];

  // Normalize + dedupe within the batch
  const seen = new Set<string>();
  const docs = [];
  for (const raw of codes) {
    const code = String(raw || "").trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    docs.push({
      code,
      type,
      priceCents: overrides.priceCents ?? defaults.priceCents,
      durationDays: overrides.durationDays ?? defaults.durationDays,
      label: overrides.label ?? defaults.label,
      revenueCatProductId: overrides.revenueCatProductId,
      maxUses: overrides.maxUses ?? 1,
      usedCount: 0,
      status: "active",
      batchId: overrides.batchId,
    });
  }

  let inserted = 0;
  try {
    const result = await PromoCodeModel.insertMany(docs, { ordered: false });
    inserted = result.length;
  } catch (err: any) {
    // ordered:false → some inserted before duplicates errored
    inserted = err?.result?.insertedCount ?? err?.insertedDocs?.length ?? 0;
  }

  return {
    requested: codes.length,
    deduplicatedInBatch: docs.length,
    inserted,
    skippedDuplicates: docs.length - inserted,
  };
};

// ─────────────────────────────────────────────────────────────
// LIST CODES (admin) — filter + paginate
// ─────────────────────────────────────────────────────────────

export const listPromoCodes = async (filters: {
  type?: string;
  status?: string;
  batchId?: string;
  page?: number;
  limit?: number;
}) => {
  const query: any = {};
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  if (filters.batchId) query.batchId = filters.batchId;

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(200, filters.limit || 50);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    PromoCodeModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PromoCodeModel.countDocuments(query),
  ]);

  return { page, limit, total, totalPages: Math.ceil(total / limit), items };
};

// ─────────────────────────────────────────────────────────────
// PROMO STATS (admin) — affiliate reporting
// Redemptions grouped by type + code-status totals
// ─────────────────────────────────────────────────────────────

export const getPromoStats = async () => {
  const [byType, statusCounts, topCodes] = await Promise.all([
    PromoRedemptionModel.aggregate([
      {
        $group: {
          _id: "$type",
          redemptions: { $sum: 1 },
          revenueCents: { $sum: "$priceCents" },
        },
      },
    ]),
    PromoCodeModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    PromoRedemptionModel.aggregate([
      { $group: { _id: "$code", redemptions: { $sum: 1 } } },
      { $sort: { redemptions: -1 } },
      { $limit: 20 },
    ]),
  ]);

  return { redemptionsByType: byType, codeStatusCounts: statusCounts, topCodes };
};

// ─────────────────────────────────────────────────────────────
// DISABLE / ENABLE CODE (admin)
// ─────────────────────────────────────────────────────────────

export const setPromoCodeDisabled = async (code: string, disabled: boolean) => {
  const normalized = (code || "").trim().toUpperCase();
  const promo = await PromoCodeModel.findOneAndUpdate(
    { code: normalized },
    { $set: { status: disabled ? "disabled" : "active" } },
    { new: true },
  );
  if (!promo) throw new Error("Promo code not found");
  return promo;
};

// ─────────────────────────────────────────────────────────────
// SET DEFAULT TRAINER (admin)
// Marks one trainer as the default app trainer (unsets others).
// ─────────────────────────────────────────────────────────────

export const setDefaultTrainer = async (trainerId: string) => {
  const trainer = await TrainerModel.findById(trainerId);
  if (!trainer) throw new Error("Trainer not found");

  await TrainerModel.updateMany(
    { _id: { $ne: trainer._id } },
    { $set: { isDefault: false } },
  );
  trainer.isDefault = true;
  await trainer.save();

  return trainer;
};
