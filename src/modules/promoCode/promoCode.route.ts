import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import {
  validatePromoController,
  redeemPromoController,
  importPromoController,
  listPromoController,
  promoStatsController,
  disablePromoController,
  setDefaultTrainerController,
} from "./promoCode.controller";

const router = Router();

// ── User routes ───────────────────────────────────────────────
// POST /promo/validate  → check code, get plan/price (no consume)
// POST /promo/redeem    → after RevenueCat purchase, grant access

router.post("/validate", guardRole("user"), validatePromoController);
router.post("/redeem", guardRole("user"), redeemPromoController);

// ── Admin routes ──────────────────────────────────────────────
// POST  /promo/import           → bulk-load pre-generated codes
// GET   /promo                  → list/filter codes (paginated)
// GET   /promo/stats            → affiliate redemption reporting
// PATCH /promo/:code/disable    → disable / re-enable a code
// POST  /promo/default-trainer  → set the default app trainer

router.post("/import", guardRole("admin"), importPromoController);
router.get("/stats", guardRole("admin"), promoStatsController);
router.get("/", guardRole("admin"), listPromoController);
router.patch("/:code/disable", guardRole("admin"), disablePromoController);
router.post(
  "/default-trainer",
  guardRole("admin"),
  setDefaultTrainerController,
);

export const PromoCodeRoutes = router;
