import { Request, Response } from "express";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";
import {
  getPlatformCommission,
  setPlatformCommission,
  calculateCommissionSplit,
} from "./commission.service";

// ─────────────────────────────────────────────────────────────
// GET /commission
// Anyone can see current platform commission rate
// (trainers need to know what % they keep)
// ─────────────────────────────────────────────────────────────

export const getCommissionController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await getPlatformCommission();
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /commission
// Admin sets the flat platform commission rate
// Body: { platformCommissionPercent }
// ─────────────────────────────────────────────────────────────

export const setCommissionController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const adminId = (req.user as JwtPayloadWithUser).id;
    const { platformCommissionPercent } = req.body;

    if (
      platformCommissionPercent === undefined ||
      platformCommissionPercent === null
    ) {
      res.status(400).json({
        success: false,
        message: "platformCommissionPercent is required",
      });
      return;
    }

    const parsed = Number(platformCommissionPercent);
    if (isNaN(parsed)) {
      res.status(400).json({
        success: false,
        message: "platformCommissionPercent must be a number",
      });
      return;
    }

    const result = await setPlatformCommission(adminId, parsed);

    res.status(200).json({
      success: true,
      message: `Platform commission set to ${result.platformCommissionPercent}%. Trainers receive ${result.trainerReceivesPercent}%.`,
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /commission/calculate
// Preview split for a given amount
// Body: { amountCents }
// Useful for admin to see exact split before setting rate
// ─────────────────────────────────────────────────────────────

export const calculateSplitController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { amountCents } = req.body;

    if (!amountCents || amountCents <= 0) {
      res.status(400).json({
        success: false,
        message: "amountCents is required and must be greater than 0",
      });
      return;
    }

    const result = await calculateCommissionSplit(Number(amountCents));

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
