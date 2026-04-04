import { Router } from "express";
import { protect } from "../../middlewares/auth";
import {
  startSession,
  sendMessage,
  endSession,
  getUsage,
  getCallHistoryController,
  getSessionHistoryController,
} from "./anam.controller";
import { guardRole } from "../../middlewares/roleGuard";

const router = Router();

// All Anam routes require authentication

// ── Session lifecycle ─────────────────────────────────────────
// POST   /anam/session/start               → user clicks call icon
// POST   /anam/session/:sessionId/message  → user speaks during call
// PATCH  /anam/session/:sessionId/end      → user ends call

router.post("/session/start", guardRole("user"), startSession);
router.post("/session/:sessionId/message", guardRole("user"), sendMessage);
router.patch("/session/:sessionId/end", guardRole("user"), endSession);

// ── Usage ─────────────────────────────────────────────────────
// GET /anam/usage
// Returns: monthlyMinutesLimit, minutesUsedThisMonth,
//          minutesRemaining, periodResetDate, isLimitReached

router.get("/usage", guardRole("user"), getUsage);

// ── History ───────────────────────────────────────────────────
// GET /anam/call-history?trainerId=&page=&limit=
// GET /anam/sessions?trainerId=&limit=

router.get("/call-history", guardRole("user"), getCallHistoryController);
router.get("/sessions", guardRole("user"), getSessionHistoryController);

export const AnamRoutes = router;
