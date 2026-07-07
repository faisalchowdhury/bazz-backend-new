import { Request, Response } from "express";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";
import {
  sendTrainerRequest,
  getMyRequest,
  getMyRequestHistory,
  cancelRequest,
  getIncomingRequests,
  getAllTrainerRequests,
  acceptRequest,
  rejectRequest,
} from "./trainerRequest.service";

// ─────────────────────────────────────────────────────────────
// POST /requests
// User sends a request to a trainer with a note
// Body: { trainerId, note }
// ─────────────────────────────────────────────────────────────

export const sendRequest = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { trainerId, note } = req.body;

    if (!trainerId) {
      res
        .status(400)
        .json({ success: false, message: "trainerId is required" });
      return;
    }
    if (!note || note.trim() === "") {
      res.status(400).json({ success: false, message: "note is required" });
      return;
    }

    const result = await sendTrainerRequest(userId, trainerId, note.trim());

    res.status(201).json({
      success: true,
      message: "Request sent successfully",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /requests/my
// User sees their current active request
// ─────────────────────────────────────────────────────────────

export const getMyRequestController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const result = await getMyRequest(userId);

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /requests/my/history
// User sees all their requests (all statuses)
// ─────────────────────────────────────────────────────────────

export const getMyRequestHistoryController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const result = await getMyRequestHistory(userId);

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /requests/:id
// User cancels their pending request
// ─────────────────────────────────────────────────────────────

export const cancelRequestController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const result = await cancelRequest(userId, req.params.id);

    res.status(200).json({
      success: true,
      message: "Request cancelled",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /requests/incoming
// Trainer sees incoming requests
// Query: status?, search?, page?, limit?
// ─────────────────────────────────────────────────────────────

export const getIncomingRequestsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { status, search, page, limit } = req.query;

    // Get trainerId from userId
    const { TrainerModel } = await import("../trainer/trainer.model");
    const trainer = await TrainerModel.findOne({ userId });
    if (!trainer) {
      res
        .status(404)
        .json({ success: false, message: "Trainer profile not found" });
      return;
    }

    const result = await getIncomingRequests(trainer.id, {
      status: status as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    });

    res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /requests/all
// Trainer sees all requests (any status)
// Query: search?, page?, limit?  (optional status? to filter)
// ─────────────────────────────────────────────────────────────

export const getAllTrainerRequestsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { status, search, page, limit } = req.query;

    const { TrainerModel } = await import("../trainer/trainer.model");
    const trainer = await TrainerModel.findOne({ userId });
    if (!trainer) {
      res
        .status(404)
        .json({ success: false, message: "Trainer profile not found" });
      return;
    }

    const result = await getAllTrainerRequests(trainer.id, {
      status: status as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    });

    res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /requests/:id/accept
// Trainer accepts a request
// ─────────────────────────────────────────────────────────────

export const acceptRequestController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;

    const { TrainerModel } = await import("../trainer/trainer.model");
    const trainer = await TrainerModel.findOne({ userId });
    if (!trainer) {
      res
        .status(404)
        .json({ success: false, message: "Trainer profile not found" });
      return;
    }

    const result = await acceptRequest(
      (trainer._id as any).toString(),
      req.params.id,
    );

    res.status(200).json({
      success: true,
      message: "Request accepted. You can now create an invoice.",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /requests/:id/reject
// Trainer rejects a request
// Body: { rejectionReason? }
// ─────────────────────────────────────────────────────────────

export const rejectRequestController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { rejectionReason } = req.body;

    const { TrainerModel } = await import("../trainer/trainer.model");
    const trainer = await TrainerModel.findOne({ userId });
    if (!trainer) {
      res
        .status(404)
        .json({ success: false, message: "Trainer profile not found" });
      return;
    }

    const result = await rejectRequest(
      (trainer._id as any).toString(),
      req.params.id,
      rejectionReason,
    );

    res.status(200).json({
      success: true,
      message: "Request rejected",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
