import { Request, Response } from "express";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";
import { TrainerModel } from "../trainer/trainer.model";
import {
  getTrainerEarningsSummary,
  requestWithdrawal,
  getMyWithdrawals,
  getAllWithdrawals,
  approveWithdrawal,
  markWithdrawalPaid,
  rejectWithdrawal,
  getTrainerPaymentHistory,
} from "./withdrawal.service";

// ─────────────────────────────────────────────────────────────
// HELPER — get trainerId from userId
// ─────────────────────────────────────────────────────────────

const getTrainerId = async (userId: string): Promise<string> => {
  const trainer = await TrainerModel.findOne({ userId });
  if (!trainer) throw new Error("Trainer profile not found");
  return (trainer._id as any).toString();
};

// ─────────────────────────────────────────────────────────────
// GET /withdrawals/earnings
// Trainer sees full earnings dashboard:
// total revenue, commission, earned, withdrawn, available
// ─────────────────────────────────────────────────────────────

export const getEarningsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const trainerId = await getTrainerId(userId);
    const result = await getTrainerEarningsSummary(trainerId);

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /withdrawals/payments
// Trainer sees their payment history (per subscriber payment)
// ─────────────────────────────────────────────────────────────

export const getPaymentHistoryController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const trainerId = await getTrainerId(userId);
    const { limit } = req.query;

    const result = await getTrainerPaymentHistory(
      trainerId,
      limit ? parseInt(limit as string) : 20,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /withdrawals
// Trainer requests a withdrawal
// Body: { requestedAmountCents, withdrawalMethod, paymentEmail, additionalNote? }
// ─────────────────────────────────────────────────────────────

export const requestWithdrawalController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const trainerId = await getTrainerId(userId);

    const {
      requestedAmountCents,
      withdrawalMethod,
      paymentEmail,
      additionalNote,
    } = req.body;

    if (!requestedAmountCents || requestedAmountCents <= 0) {
      res.status(400).json({
        success: false,
        message: "requestedAmountCents is required and must be greater than 0",
      });
      return;
    }
    if (!withdrawalMethod) {
      res.status(400).json({
        success: false,
        message: "withdrawalMethod is required (paypal, stripe, bank_transfer)",
      });
      return;
    }
    if (!paymentEmail || paymentEmail.trim() === "") {
      res.status(400).json({
        success: false,
        message: "paymentEmail is required",
      });
      return;
    }

    const result = await requestWithdrawal(
      trainerId,
      requestedAmountCents,
      withdrawalMethod,
      paymentEmail.trim(),
      additionalNote,
    );

    res.status(201).json({
      success: true,
      message: "Withdrawal request submitted. Admin will process it shortly.",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /withdrawals/my
// Trainer sees their withdrawal requests history
// ─────────────────────────────────────────────────────────────

export const getMyWithdrawalsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const trainerId = await getTrainerId(userId);
    const result = await getMyWithdrawals(trainerId);

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /withdrawals/admin/all
// Admin sees all withdrawal requests
// Query: status? (pending | approved | rejected | paid)
// ─────────────────────────────────────────────────────────────

export const getAllWithdrawalsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { status, limit } = req.query;

    const result = await getAllWithdrawals(
      status as string | undefined,
      limit ? parseInt(limit as string) : 20,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /withdrawals/:id/approve
// Admin approves request
// Body: { adminNote? }
// ─────────────────────────────────────────────────────────────

export const approveWithdrawalController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const adminId = (req.user as JwtPayloadWithUser).id;
    const { adminNote } = req.body;

    const result = await approveWithdrawal(adminId, req.params.id, adminNote);

    res.status(200).json({
      success: true,
      message: "Withdrawal approved",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /withdrawals/:id/paid
// Admin confirms payment was manually sent to trainer
// Body: { adminNote? }
// ─────────────────────────────────────────────────────────────

export const markPaidController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const adminId = (req.user as JwtPayloadWithUser).id;
    const { adminNote } = req.body;

    const result = await markWithdrawalPaid(adminId, req.params.id, adminNote);

    res.status(200).json({
      success: true,
      message: "Withdrawal marked as paid. Trainer has been notified.",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /withdrawals/:id/reject
// Admin rejects request with reason
// Body: { adminNote }
// ─────────────────────────────────────────────────────────────

export const rejectWithdrawalController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const adminId = (req.user as JwtPayloadWithUser).id;
    const { adminNote } = req.body;

    if (!adminNote || adminNote.trim() === "") {
      res.status(400).json({
        success: false,
        message: "adminNote (rejection reason) is required",
      });
      return;
    }

    const result = await rejectWithdrawal(
      adminId,
      req.params.id,
      adminNote.trim(),
    );

    res.status(200).json({
      success: true,
      message: "Withdrawal rejected",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
