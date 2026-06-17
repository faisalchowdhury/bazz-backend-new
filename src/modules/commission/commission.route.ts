import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import {
  getCommissionController,
  setCommissionController,
  calculateSplitController,
} from "./commission.controller";

const router = Router();

// ── Public ────────────────────────────────────────────────────
// GET /commission
// Anyone can view current commission rate

router.get("/", getCommissionController);

// ── Admin only ────────────────────────────────────────────────
// PATCH  /commission            → set flat commission rate
// POST   /commission/calculate  → preview split for an amount

router.patch("/", guardRole("admin"), setCommissionController);
router.post("/calculate", guardRole("admin"), calculateSplitController);

export const CommissionRoutes = router;
