import { Request, Response } from "express";
import {
  sendMessage,
  getChatHistory,
  getUserChatThreads,
  clearChatHistory,
  deleteChatThread,
  getOrCreateChatThread,
} from "./chat.service";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";

// ─────────────────────────────────────────────────────────────
// POST /chat
// Send a message — works for both default plan and trainer chat
// Body: { message, trainerId?, workoutContext? }
// ─────────────────────────────────────────────────────────────

export const sendChatMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const userId = user.id;
    const { message, trainerId, workoutContext } = req.body;

    if (!message || message.trim() === "") {
      res.status(400).json({ success: false, message: "Message is required" });
      return;
    }

    // Determine chat type from request
    const chatType = trainerId ? "trainer" : "default_plan";

    const result = await sendMessage(
      userId,
      { message: message.trim(), workoutContext },
      chatType,
      trainerId,
    );

    res.status(200).json({
      success: true,
      data: {
        chatId: result.chatId,
        userMessage: result.userMessage,
        assistantMessage: result.assistantMessage,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /chat/history
// Get chat history for a thread
// Query: trainerId? (omit for default plan), page?, limit?
// ─────────────────────────────────────────────────────────────

export const getChatHistoryController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { trainerId, page, limit } = req.query;

    const chatType = trainerId ? "trainer" : "default_plan";

    const result = await getChatHistory(
      userId,
      chatType,
      trainerId as string | undefined,
      page ? parseInt(page as string) : 1,
      limit ? parseInt(limit as string) : 20,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /chat/threads
// Get all active chat threads for the user
// ─────────────────────────────────────────────────────────────

export const getChatThreads = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const userId = user.id;
    const threads = await getUserChatThreads(userId);

    res.status(200).json({ success: true, data: threads });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /chat/thread
// Get or create a chat thread (useful for initializing the chat screen)
// Body: { trainerId? }
// ─────────────────────────────────────────────────────────────

export const initChatThread = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const userId = user.id;
    const { trainerId } = req.body;

    const chatType = trainerId ? "trainer" : "default_plan";
    const chat = await getOrCreateChatThread(userId, chatType, trainerId);

    res.status(200).json({ success: true, data: chat });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /chat/history
// Clears messages but keeps the thread
// Query: trainerId? (omit for default plan)
// ─────────────────────────────────────────────────────────────

export const clearHistory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user._id.toString();
    const { trainerId } = req.query;

    const chatType = trainerId ? "trainer" : "default_plan";

    await clearChatHistory(userId, chatType, trainerId as string | undefined);

    res.status(200).json({ success: true, message: "Chat history cleared" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /chat/:chatId
// Permanently deletes a chat thread
// ─────────────────────────────────────────────────────────────

export const deleteThread = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user._id.toString();
    await deleteChatThread(userId, req.params.chatId);

    res.status(200).json({ success: true, message: "Chat thread deleted" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
