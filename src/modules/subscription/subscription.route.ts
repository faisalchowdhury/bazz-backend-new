import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import {
  getStatusController,
  cancelSubscriptionController,
  getTrainerSubscribersController,
} from "./subscription.controller";

const router = Router();

// ── User routes ───────────────────────────────────────────────
// GET   /subscriptions/status    → check if subscription active + days remaining
// PATCH /subscriptions/:id/cancel → cancel subscription

router.get("/status", guardRole("user"), getStatusController);
router.patch("/:id/cancel", guardRole("user"), cancelSubscriptionController);

// ── Trainer routes ────────────────────────────────────────────
// GET /subscriptions/trainer     → trainer sees active subscribers
// Query: status? (default: active)

router.get("/trainer", guardRole("trainer"), getTrainerSubscribersController);

export const SubscriptionRoutes = router;
