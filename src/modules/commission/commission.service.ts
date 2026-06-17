import { CommissionModel } from "./commission.model";

// ─────────────────────────────────────────────────────────────
// GET PLATFORM COMMISSION
// Returns current commission rate
// ─────────────────────────────────────────────────────────────

export const getPlatformCommission = async () => {
  const commission = await CommissionModel.findOne().lean();

  // If no commission set yet, return default 20%
  if (!commission) {
    return {
      platformCommissionPercent: 20,
      trainerReceivesPercent: 80,
      isDefault: true,
    };
  }

  return {
    platformCommissionPercent: commission.platformCommissionPercent,
    trainerReceivesPercent: 100 - commission.platformCommissionPercent,
    updatedByAdminId: commission.updatedByAdminId,
    updatedAt: commission.updatedAt,
    isDefault: false,
  };
};

// ─────────────────────────────────────────────────────────────
// SET PLATFORM COMMISSION (admin only)
// Creates or updates the single commission document
// ─────────────────────────────────────────────────────────────

export const setPlatformCommission = async (
  adminId: string,
  platformCommissionPercent: number,
) => {
  if (platformCommissionPercent < 0 || platformCommissionPercent > 100) {
    throw new Error("Commission must be between 0 and 100");
  }

  // Upsert — only one commission document ever exists
  const commission = await CommissionModel.findOneAndUpdate(
    {}, // match any (there's only one)
    {
      $set: {
        platformCommissionPercent,
        updatedByAdminId: adminId,
      },
    },
    {
      new: true,
      upsert: true, // create if doesn't exist
    },
  );

  return {
    platformCommissionPercent: commission.platformCommissionPercent,
    trainerReceivesPercent: 100 - commission.platformCommissionPercent,
    updatedByAdminId: commission.updatedByAdminId,
    updatedAt: commission.updatedAt,
  };
};

// ─────────────────────────────────────────────────────────────
// CALCULATE SPLIT
// Helper used in payment service to calculate trainer payout
// e.g. invoice amount $100, commission 20%
//   → platform gets $20
//   → trainer gets  $80
// ─────────────────────────────────────────────────────────────

export const calculateCommissionSplit = async (invoiceAmountCents: number) => {
  const commission = await getPlatformCommission();

  const platformAmountCents = Math.round(
    (invoiceAmountCents * commission.platformCommissionPercent) / 100,
  );
  const trainerAmountCents = invoiceAmountCents - platformAmountCents;

  return {
    totalAmountCents: invoiceAmountCents,
    platformAmountCents,
    trainerAmountCents,
    platformPercent: commission.platformCommissionPercent,
    trainerPercent: 100 - commission.platformCommissionPercent,
  };
};
