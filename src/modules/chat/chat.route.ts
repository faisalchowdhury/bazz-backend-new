import { Router } from "express";
import { protect } from "../../middlewares/auth";
import {
  sendChatMessage,
  getChatHistoryController,
  getChatThreads,
  initChatThread,
  clearHistory,
  deleteThread,
} from "./chat.controller";
import { guardRole } from "../../middlewares/roleGuard";

const router = Router();

// ── Thread management ─────────────────────────────────────────
// GET    /chat/threads          → get all chat threads for user
// POST   /chat/thread           → init/get thread (call on chat screen open)

router.get("/threads", guardRole(["user", "trainer"]), getChatThreads);
router.post("/thread", guardRole(["user", "trainer"]), initChatThread);

// ── Messaging ─────────────────────────────────────────────────
// POST   /chat                  → send message (default plan or trainer)
// GET    /chat/history          → get paginated chat history

router.post("/", guardRole(["user"]), sendChatMessage);
router.get("/history", guardRole(["user"]), getChatHistoryController);

// ── Cleanup ───────────────────────────────────────────────────
// DELETE /chat/history          → clear messages (keep thread)
// DELETE /chat/:chatId          → delete entire thread

router.delete("/history", guardRole(["trainer"]), clearHistory);
router.delete("/:chatId", guardRole(["trainer"]), deleteThread);

export const ChatRoutes = router;
