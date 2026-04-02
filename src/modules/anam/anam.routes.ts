import { Router } from "express";
import { protect } from "../../middlewares/auth";
import { guardRole } from "../../middlewares/roleGuard";
import {
  startSession,
  sendMessage,
  endSession,
  getCallHistoryController,
  getSessionHistoryController,
} from "./anam.controller";

const router = Router();

// All Anam routes require authentication

// ── Session lifecycle ─────────────────────────────────────────
// POST   /anam/session/start              → user clicks call icon
// POST   /anam/session/:sessionId/message → user speaks during call
// PATCH  /anam/session/:sessionId/end     → user ends call

router.post("/session/start", guardRole("user"), startSession);
router.post("/session/:sessionId/message", guardRole("user"), sendMessage);
router.patch("/session/:sessionId/end", guardRole("user"), endSession);

// ── History ───────────────────────────────────────────────────
// GET /anam/call-history?trainerId=&page=&limit=
// Returns only anam_call messages from chat thread

router.get("/call-history", guardRole("user"), getCallHistoryController);

// GET /anam/sessions?trainerId=&limit=
// Returns completed AnamSession documents (call logs)

router.get("/sessions", guardRole("user"), getSessionHistoryController);

export const AnamRoutes = router;
