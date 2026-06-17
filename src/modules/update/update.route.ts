import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import {
  createUpdateController,
  getMyUpdatesController,
  getTodaysUpdatesController,
  getUnreadCountController,
  markAsReadController,
  markAllAsReadController,
  getSentUpdatesController,
  deleteUpdateController,
} from "./update.controller";

const router = Router();

// ── User routes ───────────────────────────────────────────────
// GET  /updates/today          → today's updates only
// GET  /updates/my             → all updates (newest first)
// GET  /updates/unread-count   → badge count
// PATCH /updates/read-all      → mark all as read
// PATCH /updates/:id/read      → mark single as read

router.get("/today", guardRole("user"), getTodaysUpdatesController);
router.get("/my", guardRole("user"), getMyUpdatesController);
router.get("/unread-count", guardRole("user"), getUnreadCountController);
router.patch("/read-all", guardRole("user"), markAllAsReadController);
router.patch("/:id/read", guardRole("user"), markAsReadController);

// ── Trainer routes ────────────────────────────────────────────
// POST   /updates              → send update to a user
// GET    /updates/sent         → see all updates trainer sent
// DELETE /updates/:id          → delete an update

router.post("/", guardRole("trainer"), createUpdateController);
router.get("/sent", guardRole("trainer"), getSentUpdatesController);
router.delete("/:id", guardRole("trainer"), deleteUpdateController);

export const UpdateRoutes = router;
