import { Request, Response } from "express";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";
import {
  createUpdate,
  getMyUpdates,
  getTodaysUpdates,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  getSentUpdates,
  deleteUpdate,
} from "./update.service";

// ─────────────────────────────────────────────────────────────
// POST /updates
// Trainer sends an update to a specific user
// Body: { userId, title, description }
// ─────────────────────────────────────────────────────────────

export const createUpdateController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const trainerUserId = (req.user as JwtPayloadWithUser).id;
    const { userId, title, description } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, message: "userId is required" });
      return;
    }
    if (!title || title.trim() === "") {
      res.status(400).json({ success: false, message: "title is required" });
      return;
    }
    if (!description || description.trim() === "") {
      res
        .status(400)
        .json({ success: false, message: "description is required" });
      return;
    }

    const result = await createUpdate(
      trainerUserId,
      userId,
      title.trim(),
      description.trim(),
    );

    res.status(201).json({
      success: true,
      message: "Update sent to user",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /updates/my
// User sees all their updates (newest first)
// Query: limit?
// ─────────────────────────────────────────────────────────────

export const getMyUpdatesController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { limit } = req.query;

    const result = await getMyUpdates(
      userId,
      limit ? parseInt(limit as string) : 20,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /updates/today
// User sees only today's updates
// ─────────────────────────────────────────────────────────────

export const getTodaysUpdatesController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const result = await getTodaysUpdates(userId);

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /updates/unread-count
// Returns unread count for notification badge
// ─────────────────────────────────────────────────────────────

export const getUnreadCountController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const count = await getUnreadCount(userId);

    res.status(200).json({ success: true, data: { unreadCount: count } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /updates/:id/read
// User marks a single update as read
// ─────────────────────────────────────────────────────────────

export const markAsReadController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const result = await markAsRead(userId, req.params.id);

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /updates/read-all
// User marks all updates as read
// ─────────────────────────────────────────────────────────────

export const markAllAsReadController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    await markAllAsRead(userId);

    res
      .status(200)
      .json({ success: true, message: "All updates marked as read" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /updates/sent
// Trainer sees all updates they have sent
// ─────────────────────────────────────────────────────────────

export const getSentUpdatesController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const trainerUserId = (req.user as JwtPayloadWithUser).id;
    const { limit } = req.query;

    const result = await getSentUpdates(
      trainerUserId,
      limit ? parseInt(limit as string) : 20,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /updates/:id
// Trainer deletes their own update
// ─────────────────────────────────────────────────────────────

export const deleteUpdateController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const trainerUserId = (req.user as JwtPayloadWithUser).id;
    await deleteUpdate(trainerUserId, req.params.id);

    res.status(200).json({ success: true, message: "Update deleted" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
