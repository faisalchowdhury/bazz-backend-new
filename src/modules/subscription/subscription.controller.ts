import { Request, Response } from "express";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";
import {
  getSubscriptionStatus,
  cancelSubscription,
  getTrainerSubscriptions,
} from "./subscription.service";

// ─────────────────────────────────────────────────────────────
// GET /subscriptions/status
// User checks if subscription is active + days remaining
// ─────────────────────────────────────────────────────────────

export const getStatusController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const result = await getSubscriptionStatus(userId);

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /subscriptions/:id/cancel
// User cancels their active subscription
// ─────────────────────────────────────────────────────────────

export const cancelSubscriptionController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const result = await cancelSubscription(userId, req.params.id);

    res.status(200).json({
      success: true,
      message: "Subscription cancelled",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /subscriptions/trainer
// Trainer sees their active subscribers
// Query: status?
// ─────────────────────────────────────────────────────────────

export const getTrainerSubscribersController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { status } = req.query;

    const { TrainerModel } = await import("../trainer/trainer.model");
    const trainer = await TrainerModel.findOne({ userId });
    if (!trainer) {
      res
        .status(404)
        .json({ success: false, message: "Trainer profile not found" });
      return;
    }

    const result = await getTrainerSubscriptions(
      (trainer._id as any).toString(),
      status as string | undefined,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
