import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import {
  sendRequest,
  getMyRequestController,
  getMyRequestHistoryController,
  cancelRequestController,
  getIncomingRequestsController,
  acceptRequestController,
  rejectRequestController,
} from "./trainerRequest.controller";

const router = Router();

// ── User routes ───────────────────────────────────────────────
// POST   /requests                → user sends request + note
// GET    /requests/my             → user sees active request
// GET    /requests/my/history     → user sees all request history
// DELETE /requests/:id            → user cancels pending request

router.post("/", guardRole("user"), sendRequest);
router.get("/my", guardRole("user"), getMyRequestController);
router.get("/my/history", guardRole("user"), getMyRequestHistoryController);
router.delete("/:id", guardRole("user"), cancelRequestController);

// ── Trainer routes ────────────────────────────────────────────
// GET    /requests/incoming       → trainer sees pending requests
// PATCH  /requests/:id/accept     → trainer accepts
// PATCH  /requests/:id/reject     → trainer rejects with reason

router.get("/incoming", guardRole("trainer"), getIncomingRequestsController);
router.patch("/:id/accept", guardRole("trainer"), acceptRequestController);
router.patch("/:id/reject", guardRole("trainer"), rejectRequestController);

export const TrainerRequestRoutes = router;
