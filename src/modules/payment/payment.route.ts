import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import {
  verifyPaymentController,
  getMyPaymentsController,
} from "./payment.controller";

const router = Router();

// ── User routes ───────────────────────────────────────────────
// POST /payments/verify   → Flutter sends transactionId → backend verifies → grants access
// GET  /payments/my       → user sees payment history

router.post("/verify", guardRole("user"), verifyPaymentController);
router.get("/my", guardRole("user"), getMyPaymentsController);

export const PaymentRoutes = router;
