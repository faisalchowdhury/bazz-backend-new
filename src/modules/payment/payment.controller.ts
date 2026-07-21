import { Request, Response } from "express";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";
import {
  verifyPayment,
  getMyPayments,
  createDefaultCheckoutSession,
} from "./payment.service";

// ─────────────────────────────────────────────────────────────
// POST /payments/verify
// Flutter sends payment data → backend verifies → grants access
// Body: { invoiceId, transactionId, gateway }
// ─────────────────────────────────────────────────────────────

export const verifyPaymentController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { invoiceId, transactionId, gateway } = req.body;

    if (!invoiceId) {
      res
        .status(400)
        .json({ success: false, message: "invoiceId is required" });
      return;
    }
    // if (!transactionId) {
    //   res
    //     .status(400)
    //     .json({ success: false, message: "transactionId is required" });
    //   return;
    // }
    // if (!gateway) {
    //   res.status(400).json({
    //     success: false,
    //     message: "gateway is required (stripe, bkash, nagad)",
    //   });
    //   return;
    // }

    const result = await verifyPayment(
      userId,
      invoiceId,
      transactionId,
      gateway,
    );

    res.status(200).json({
      success: true,
      message: "Payment verified. You now have full access!",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /payments/my
// User sees their payment history
// ─────────────────────────────────────────────────────────────

export const getMyPaymentsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const result = await getMyPayments(userId);

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /payments/checkout/default
// Create Stripe Checkout Session for dynamic app-wide subscription (Monthly/Annual)
// ─────────────────────────────────────────────────────────────
export const createDefaultCheckoutController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { tier, promoCode } = req.body;

    if (!tier || !["monthly", "annual"].includes(tier)) {
      res.status(400).json({
        success: false,
        message: "tier is required and must be 'monthly' or 'annual'",
      });
      return;
    }

    const result = await createDefaultCheckoutSession(userId, tier, promoCode);

    res.status(200).json({
      success: true,
      message: "Stripe default subscription checkout session created.",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
