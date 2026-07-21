import { Types } from "mongoose";
import { WithdrawalModel } from "./withdrawal.model";
import { PaymentModel } from "../payment/payment.model";
import { getPlatformCommission } from "../commission/commission.service";
import { TrainerModel } from "../trainer/trainer.model";
import { sendAdminNotification } from "../notifications/notification.helper";

// ─────────────────────────────────────────────────────────────
// HELPER — GET TRAINER EARNINGS SUMMARY
// Calculates from PaymentModel — all verified payments for trainer
// ─────────────────────────────────────────────────────────────

export const getTrainerEarningsSummary = async (trainerId: string) => {
  // 1. All verified payments for this trainer
  const payments = await PaymentModel.find({
    trainerId,
    status: "verified",
  }).lean();

  // 2. Total revenue (full invoice amounts)
  const totalRevenueCents = payments.reduce((sum, p) => sum + p.amount, 0);

  // 3. Total platform commission taken
  const totalPlatformCents = payments.reduce(
    (sum, p) => sum + (p.platformAmountCents || 0),
    0,
  );

  // 4. Total trainer earnings (after commission)
  const totalEarnedCents = payments.reduce(
    (sum, p) => sum + (p.trainerAmountCents || 0),
    0,
  );

  // 5. Total already withdrawn (approved + paid requests)
  const withdrawals = await WithdrawalModel.find({
    trainerId,
    status: { $in: ["approved", "paid"] },
  }).lean();

  const totalWithdrawnCents = withdrawals.reduce(
    (sum, w) => sum + w.requestedAmountCents,
    0,
  );

  // 6. Available balance
  const availableBalanceCents = Math.max(
    0,
    totalEarnedCents - totalWithdrawnCents,
  );

  // 7. Pending withdrawal amount (requested but not yet processed)
  const pendingWithdrawals = await WithdrawalModel.find({
    trainerId,
    status: "pending",
  }).lean();

  const pendingWithdrawalCents = pendingWithdrawals.reduce(
    (sum, w) => sum + w.requestedAmountCents,
    0,
  );

  // 8. Current commission rate
  const commission = await getPlatformCommission();

  return {
    // Revenue breakdown
    totalRevenueCents, // full invoice amounts collected
    totalPlatformCents, // what platform took (commission)
    totalEarnedCents, // trainer's share after commission

    // Withdrawal summary
    totalWithdrawnCents, // already paid out to trainer
    pendingWithdrawalCents, // requested but not yet processed
    availableBalanceCents, // can request withdrawal up to this

    // Commission info
    commissionPercent: commission.platformCommissionPercent,
    trainerReceivesPercent: 100 - commission.platformCommissionPercent,

    // Payment count
    totalPayments: payments.length,

    // Formatted (dollars) for easy reading
    formatted: {
      totalRevenue: `$${(totalRevenueCents / 100).toFixed(2)}`,
      platformEarned: `$${(totalPlatformCents / 100).toFixed(2)}`,
      trainerEarned: `$${(totalEarnedCents / 100).toFixed(2)}`,
      totalWithdrawn: `$${(totalWithdrawnCents / 100).toFixed(2)}`,
      pendingWithdrawal: `$${(pendingWithdrawalCents / 100).toFixed(2)}`,
      availableBalance: `$${(availableBalanceCents / 100).toFixed(2)}`,
    },
  };
};

// ─────────────────────────────────────────────────────────────
// REQUEST WITHDRAWAL (trainer)
// ─────────────────────────────────────────────────────────────

export const requestWithdrawal = async (
  trainerId: string,
  requestedAmountCents: number,
  withdrawalMethod: "paypal" | "stripe" | "bank_transfer",
  paymentEmail: string,
  additionalNote?: string,
) => {
  // 1. Validate amount
  if (requestedAmountCents <= 0) {
    throw new Error("Withdrawal amount must be greater than 0");
  }

  // 2. Check no pending withdrawal already exists
  const existingPending = await WithdrawalModel.findOne({
    trainerId,
    status: "pending",
  });
  if (existingPending) {
    throw new Error(
      "You already have a pending withdrawal request. Wait for it to be processed before submitting another.",
    );
  }

  // 3. Get earnings summary to validate available balance
  const earnings = await getTrainerEarningsSummary(trainerId);

  if (requestedAmountCents > earnings.availableBalanceCents) {
    throw new Error(
      `Insufficient balance. Available: ${earnings.formatted.availableBalance}. ` +
        `Requested: $${(requestedAmountCents / 100).toFixed(2)}`,
    );
  }

  // 4. Create withdrawal request
  const withdrawal = await WithdrawalModel.create({
    trainerId,
    requestedAmountCents,

    // Snapshot earnings at request time for audit trail
    totalEarnedCents: earnings.totalEarnedCents,
    totalWithdrawnCents: earnings.totalWithdrawnCents,
    availableBalanceCents: earnings.availableBalanceCents,
    commissionPercent: earnings.commissionPercent,

    withdrawalMethod,
    paymentEmail,
    additionalNote,
    status: "pending",
  });

  // Send admin notification
  const trainer = await TrainerModel.findById(trainerId).select("name userId");
  if (trainer) {
    const amountInDollars = (requestedAmountCents / 100).toFixed(2);
    await sendAdminNotification({
      userId: trainer.userId,
      title: "New Withdrawal Request 💰",
      message: `Trainer "${trainer.name}" has requested a withdrawal of $${amountInDollars} via ${withdrawalMethod}.`,
    });
  }

  return {
    withdrawal,
    earningsSnapshot: earnings,
  };
};

// ─────────────────────────────────────────────────────────────
// GET MY WITHDRAWALS (trainer sees their requests)
// ─────────────────────────────────────────────────────────────

export const getMyWithdrawals = async (trainerId: string) => {
  return await WithdrawalModel.find({ trainerId })
    .sort({ createdAt: -1 })
    .lean();
};

// ─────────────────────────────────────────────────────────────
// GET ALL WITHDRAWALS (admin sees all requests)
// ─────────────────────────────────────────────────────────────

export const getAllWithdrawals = async (status?: string, limit = 20) => {
  const query: any = {};
  if (status) query.status = status;

  return await WithdrawalModel.find(query)
    .populate("trainerId", "name specialty profileImage")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// ─────────────────────────────────────────────────────────────
// APPROVE WITHDRAWAL (admin)
// Admin has manually sent the payment → marks as approved
// ─────────────────────────────────────────────────────────────

export const approveWithdrawal = async (
  adminId: string,
  withdrawalId: string,
  adminNote?: string,
) => {
  const withdrawal = await WithdrawalModel.findOne({
    _id: withdrawalId,
    status: "pending",
  });
  if (!withdrawal)
    throw new Error("Withdrawal request not found or not pending");

  withdrawal.status = "approved";
  withdrawal.adminNote = adminNote;
  withdrawal.processedByAdminId = adminId;
  withdrawal.processedAt = new Date();
  await withdrawal.save();

  return withdrawal;
};

// ─────────────────────────────────────────────────────────────
// MARK AS PAID (admin confirms payment was sent)
// ─────────────────────────────────────────────────────────────

export const markWithdrawalPaid = async (
  adminId: string,
  withdrawalId: string,
  adminNote?: string,
) => {
  const withdrawal = await WithdrawalModel.findOne({
    _id: withdrawalId,
    status: { $in: ["pending", "approved"] },
  });
  if (!withdrawal) throw new Error("Withdrawal request not found");

  withdrawal.status = "paid";
  withdrawal.adminNote = adminNote || withdrawal.adminNote;
  withdrawal.processedByAdminId = adminId;
  withdrawal.processedAt = new Date();
  await withdrawal.save();

  return withdrawal;
};

// ─────────────────────────────────────────────────────────────
// REJECT WITHDRAWAL (admin)
// ─────────────────────────────────────────────────────────────

export const rejectWithdrawal = async (
  adminId: string,
  withdrawalId: string,
  adminNote: string,
) => {
  if (!adminNote || adminNote.trim() === "") {
    throw new Error("Rejection reason is required");
  }

  const withdrawal = await WithdrawalModel.findOne({
    _id: withdrawalId,
    status: "pending",
  });
  if (!withdrawal)
    throw new Error("Withdrawal request not found or not pending");

  withdrawal.status = "rejected";
  withdrawal.adminNote = adminNote;
  withdrawal.processedByAdminId = adminId;
  withdrawal.processedAt = new Date();
  await withdrawal.save();

  return withdrawal;
};

// ─────────────────────────────────────────────────────────────
// GET TRAINER PAYMENTS (detailed payment history for trainer)
// ─────────────────────────────────────────────────────────────

export const getTrainerPaymentHistory = async (
  trainerId: string,
  limit = 20,
) => {
  return await PaymentModel.find({
    trainerId,
    status: "verified",
  })
    .populate("userId", "firstName lastName email profilePicture")
    .populate("invoiceId", "description amount periodStart periodEnd")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};
