import { Request, Response } from "express";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";
import {
  validatePromoCode,
  redeemPromoCode,
  bulkImportCodes,
  listPromoCodes,
  getPromoStats,
  setPromoCodeDisabled,
  setDefaultTrainer,
} from "./promoCode.service";

// ─────────────────────────────────────────────────────────────
// POST /promo/validate   (user)
// Body: { code }
// Checks a code and returns the plan it unlocks (price + duration)
// so the app can present the right RevenueCat product. Non-consuming.
// ─────────────────────────────────────────────────────────────

export const validatePromoController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { code } = req.body;
    const result = await validatePromoCode(code);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /promo/redeem   (user)
// Body: { code, revenueCatTransactionId?, revenueCatProductId? }
// Call AFTER the RevenueCat purchase succeeds. Consumes the code
// and grants default-trainer access for the plan duration.
// ─────────────────────────────────────────────────────────────

export const redeemPromoController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { code, revenueCatTransactionId, revenueCatProductId } = req.body;

    if (!code || String(code).trim() === "") {
      res.status(400).json({ success: false, message: "code is required" });
      return;
    }

    const result = await redeemPromoCode(userId, code, {
      revenueCatTransactionId,
      revenueCatProductId,
    });

    res.status(201).json({
      success: true,
      message: `Promo applied. ${result.plan.label} unlocked.`,
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /promo/import   (admin)
// Body: { type, codes: string[], priceCents?, durationDays?,
//         label?, revenueCatProductId?, maxUses?, batchId? }
// Bulk-load pre-generated codes for one category.
// ─────────────────────────────────────────────────────────────

export const importPromoController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      type,
      codes,
      priceCents,
      durationDays,
      label,
      revenueCatProductId,
      maxUses,
      batchId,
    } = req.body;

    const result = await bulkImportCodes(type, codes, {
      priceCents,
      durationDays,
      label,
      revenueCatProductId,
      maxUses,
      batchId,
    });

    res.status(201).json({
      success: true,
      message: `Imported ${result.inserted} ${type} code(s).`,
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /promo   (admin)
// Query: type? status? batchId? page? limit?
// ─────────────────────────────────────────────────────────────

export const listPromoController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { type, status, batchId, page, limit } = req.query;
    const result = await listPromoCodes({
      type: type as string,
      status: status as string,
      batchId: batchId as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /promo/stats   (admin) — affiliate reporting
// ─────────────────────────────────────────────────────────────

export const promoStatsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await getPromoStats();
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /promo/:code/disable   (admin)
// Body: { disabled?: boolean }  (default true)
// ─────────────────────────────────────────────────────────────

export const disablePromoController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const disabled = req.body?.disabled !== false; // default true
    const result = await setPromoCodeDisabled(req.params.code, disabled);
    res.status(200).json({
      success: true,
      message: disabled ? "Promo code disabled" : "Promo code re-enabled",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /promo/default-trainer   (admin)
// Body: { trainerId }
// Marks the trainer promo subscriptions grant access to.
// ─────────────────────────────────────────────────────────────

export const setDefaultTrainerController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { trainerId } = req.body;
    if (!trainerId) {
      res.status(400).json({ success: false, message: "trainerId is required" });
      return;
    }
    const trainer = await setDefaultTrainer(trainerId);
    res.status(200).json({
      success: true,
      message: `${trainer.name} is now the default app trainer.`,
      data: trainer,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
