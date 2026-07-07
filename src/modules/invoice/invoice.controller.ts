import { Request, Response } from "express";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";
import {
  createInvoice,
  sendInvoice,
  createRenewalInvoice,
  getMyInvoices,
  getInvoiceById,
  getTrainerInvoices,
} from "./invoice.service";
import { TrainerModel } from "../trainer/trainer.model";

// ─────────────────────────────────────────────────────────────
// POST /invoices
// Trainer creates invoice for accepted request (generates PDF)
// Body: { requestId, amount, description }
// ─────────────────────────────────────────────────────────────

export const createInvoiceController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { requestId, amount, description } = req.body;

    if (!requestId) {
      res
        .status(400)
        .json({ success: false, message: "requestId is required" });
      return;
    }
    if (!amount || amount <= 0) {
      res.status(400).json({
        success: false,
        message: "amount is required and must be greater than 0",
      });
      return;
    }
    if (!description || description.trim() === "") {
      res
        .status(400)
        .json({ success: false, message: "description is required" });
      return;
    }

    const trainer = await TrainerModel.findOne({ userId });
    if (!trainer) {
      res
        .status(404)
        .json({ success: false, message: "Trainer profile not found" });
      return;
    }

    const result = await createInvoice(
      (trainer._id as any).toString(),
      requestId,
      amount,
      description.trim(),
    );

    res.status(201).json({
      success: true,
      message: "Invoice created with PDF",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /invoices/:id/send
// Trainer clicks "Send Invoice" — user gets notified
// ─────────────────────────────────────────────────────────────

export const sendInvoiceController = async (
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

    const result = await sendInvoice(
      (trainer._id as any).toString(),
      req.params.id,
    );

    res.status(200).json({
      success: true,
      message: "Invoice sent to user",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /invoices/renewal
// Trainer creates a renewal invoice after 30 days
// Body: { previousInvoiceId, amount, description }
// ─────────────────────────────────────────────────────────────

export const createRenewalInvoiceController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { previousInvoiceId, amount, description } = req.body;

    if (!previousInvoiceId || !amount || !description) {
      res.status(400).json({
        success: false,
        message: "previousInvoiceId, amount and description are required",
      });
      return;
    }

    const trainer = await TrainerModel.findOne({ userId });
    if (!trainer) {
      res
        .status(404)
        .json({ success: false, message: "Trainer profile not found" });
      return;
    }

    const result = await createRenewalInvoice(
      (trainer._id as any).toString(),
      previousInvoiceId,
      amount,
      description.trim(),
    );

    res.status(201).json({
      success: true,
      message: "Renewal invoice created",
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /invoices/my
// User sees their received invoices
// ─────────────────────────────────────────────────────────────

export const getMyInvoicesController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const result = await getMyInvoices(userId);

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /invoices/trainer
// Trainer sees all their created invoices
// Query: status?, search?, page?, limit?
// ─────────────────────────────────────────────────────────────

export const getTrainerInvoicesController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { status, search, page, limit } = req.query;

    const trainer = await TrainerModel.findOne({ userId });
    if (!trainer) {
      res
        .status(404)
        .json({ success: false, message: "Trainer profile not found" });
      return;
    }

    const result = await getTrainerInvoices(trainer.id, {
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
// GET /invoices/:id
// Get single invoice (user or trainer can access their own)
// ─────────────────────────────────────────────────────────────

export const getInvoiceByIdController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const result = await getInvoiceById(req.params.id, userId);

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
};
