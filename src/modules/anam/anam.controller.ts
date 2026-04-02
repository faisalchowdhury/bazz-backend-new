import { Request, Response } from "express";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";
import {
  setTrainerPersonaId,
  removeTrainerPersona,
  startAnamSession,
  sendAnamMessage,
  endAnamSession,
  getCallHistory,
  getSessionHistory,
} from "./anam.service";

// ─────────────────────────────────────────────────────────────
// PUT /trainers/:id/anam
// Trainer sets their Anam personaId via app form
// Body: { personaId }
// ─────────────────────────────────────────────────────────────

export const setPersonaId = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { personaId } = req.body;

    if (!personaId || personaId.trim() === "") {
      res
        .status(400)
        .json({ success: false, message: "personaId is required" });
      return;
    }

    const trainer = await setTrainerPersonaId(req.params.id, personaId.trim());

    res.status(200).json({
      success: true,
      message: "Anam AI persona configured successfully",
      data: {
        trainerId: req.params.id,
        personaId: trainer.anamAI?.personaId,
        isEnabled: trainer.anamAI?.isEnabled,
      },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /trainers/:id/anam
// Trainer removes their Anam persona
// ─────────────────────────────────────────────────────────────

export const removePersona = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await removeTrainerPersona(req.params.id);
    res.status(200).json({ success: true, message: "Anam AI persona removed" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /anam/session/start
// User clicks call icon — starts an Anam session
// Body: { trainerId }
// ─────────────────────────────────────────────────────────────

export const startSession = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    console.log(userId);
    const { trainerId } = req.body;

    if (!trainerId) {
      res
        .status(400)
        .json({ success: false, message: "trainerId is required" });
      return;
    }

    const result = await startAnamSession(userId, trainerId);

    res.status(201).json({
      success: true,
      message: "Anam call session started",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /anam/session/:sessionId/message
// User speaks — sends message during active Anam call
// Body: { trainerId, message }
// ─────────────────────────────────────────────────────────────

export const sendMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { trainerId, message } = req.body;

    if (!trainerId) {
      res
        .status(400)
        .json({ success: false, message: "trainerId is required" });
      return;
    }
    if (!message || message.trim() === "") {
      res.status(400).json({ success: false, message: "message is required" });
      return;
    }

    const result = await sendAnamMessage(
      userId,
      trainerId,
      req.params.sessionId,
      message.trim(),
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /anam/session/:sessionId/end
// User ends the call
// ─────────────────────────────────────────────────────────────

export const endSession = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const result = await endAnamSession(userId, req.params.sessionId);

    res.status(200).json({
      success: true,
      message: "Call ended",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /anam/call-history?trainerId=&page=&limit=
// Get only anam_call messages from the chat thread
// ─────────────────────────────────────────────────────────────

export const getCallHistoryController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { trainerId, page, limit } = req.query;

    if (!trainerId) {
      res
        .status(400)
        .json({ success: false, message: "trainerId is required" });
      return;
    }

    const result = await getCallHistory(
      userId,
      trainerId as string,
      page ? parseInt(page as string) : 1,
      limit ? parseInt(limit as string) : 20,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /anam/sessions?trainerId=&limit=
// Get user's call session history (completed sessions)
// ─────────────────────────────────────────────────────────────

export const getSessionHistoryController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { trainerId, limit } = req.query;

    const result = await getSessionHistory(
      userId,
      trainerId as string | undefined,
      limit ? parseInt(limit as string) : 10,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
