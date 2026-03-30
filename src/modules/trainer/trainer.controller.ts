import { Request, Response } from "express";
import {
  getAllTrainers as getAllTrainersService,
  getTrainerById,
  getTrainerFullProfile,
  getTrainerBySpecialty,
  createTrainerService,
  updateTrainerService,
  deleteTrainerService,
} from "./trainer.service";
import { getBlocksByTrainer } from "../exerciseBlock/exerciseBlock.service";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";

// ─────────────────────────────────────────────────────────────
// GET /trainers
// ─────────────────────────────────────────────────────────────

export const getAllTrainers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { specialty, verified } = req.query;
    const trainers = await getAllTrainersService({
      specialty: specialty as string | undefined,
      isVerified: verified === undefined ? undefined : verified === "true",
    });
    res.json({ success: true, data: trainers });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /trainers/specialty/:specialty
// ─────────────────────────────────────────────────────────────

export const getTrainersBySpecialty = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const trainers = await getTrainerBySpecialty(req.params.specialty);
    res.json({ success: true, data: trainers });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /trainers/:id
// ─────────────────────────────────────────────────────────────

export const getTrainer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const trainer = await getTrainerById(req.params.id);
    if (!trainer) {
      res.status(404).json({ success: false, message: "Trainer not found" });
      return;
    }
    res.json({ success: true, data: trainer });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /trainers/:id/full
// Returns trainer + knowledgePack + all blocks + exercises + steps
// ─────────────────────────────────────────────────────────────

export const getTrainerFull = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const trainer = await getTrainerFullProfile(req.params.id);
    res.json({ success: true, data: trainer });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /trainers/:id/blocks  ← same endpoint as before
// Now fetches from exercise_blocks collection
// ─────────────────────────────────────────────────────────────

export const getExerciseLibrary = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { category, approvedOnly } = req.query;
    const blocks = await getBlocksByTrainer(req.params.id, {
      category: category as string | undefined,
      approvedOnly: approvedOnly === "true",
    });
    res.json({ success: true, data: blocks });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /trainers
// ─────────────────────────────────────────────────────────────

export const createTrainer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const trainer = await createTrainerService(user.id, req.body);
    res.status(201).json({ success: true, data: trainer });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /trainers/:id
// ─────────────────────────────────────────────────────────────

export const updateTrainer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const trainer = await updateTrainerService(req.params.id, req.body);
    res.json({ success: true, data: trainer });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /trainers/:id
// ─────────────────────────────────────────────────────────────

export const deleteTrainer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await deleteTrainerService(req.params.id);
    res.json({ success: true, message: "Trainer deleted" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
