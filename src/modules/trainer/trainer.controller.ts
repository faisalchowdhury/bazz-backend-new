import { Request, Response } from "express";
import {
  generateExerciseBlockWithAI,
  getTrainerById,
  getTrainerBySpecialty,
  getTrainerExerciseLibrary,
  updateExerciseInBlock,
  updateTrainer as updateTrainerService,
  getAllTrainers as getAllTrainersService,
  createExerciseBlock as createExerciseBlockService,
  approveExerciseBlock as approveExerciseBlockService,
  addExerciseToBlockService,
  deleteExerciseBlock as deleteExerciseBlockService,
  createTrainerService,
} from "./trainer.service";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";

// ─────────────────────────────────────────────────────────────
// GET /trainers — Browse all trainers
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
// GET /trainers/:id — Get trainer profile
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
// GET /trainers/specialty/:specialty — Auto-assign at onboarding
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
// POST /trainers — Create trainer profile
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
// PUT /trainers/:id — Update trainer profile
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
// GET /trainers/:id/blocks — Get exercise library
// ─────────────────────────────────────────────────────────────

export const getExerciseLibrary = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { category, approvedOnly } = req.query;
    const blocks = await getTrainerExerciseLibrary(req.params.id, {
      category: category as string | undefined,
      approvedOnly: approvedOnly === "true",
    });
    res.json({ success: true, data: blocks });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /trainers/:id/blocks — Create block manually
// ─────────────────────────────────────────────────────────────

export const createExerciseBlock = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const block = await createExerciseBlockService(req.params.id, req.body);
    res.status(201).json({ success: true, data: block });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /trainers/:id/blocks/generate — AI-generate exercise block
// ─────────────────────────────────────────────────────────────

export const generateExerciseBlock = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { blockName, category, count, context } = req.body;

    if (!blockName || !category || !count) {
      res.status(400).json({
        success: false,
        message: "blockName, category, and count are required",
      });
      return;
    }

    const block = await generateExerciseBlockWithAI(req.params.id, {
      blockName,
      category,
      count: parseInt(count),
      context,
      // etA: req.body.etA, // Add this line to provide the required etA property
    });

    res.status(201).json({
      success: true,
      message:
        "Block generated. Please review and approve before it goes live to users.",
      data: block,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /trainers/:id/blocks/:blockId/approve — Approve AI block
// ─────────────────────────────────────────────────────────────

export const approveExerciseBlock = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const block = await approveExerciseBlockService(
      req.params.id,
      req.params.blockId,
    );
    res.json({
      success: true,
      message: "Block approved and now live",
      data: block,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /trainers/:id/blocks/:blockId — Update block
// ─────────────────────────────────────────────────────────────

export const updateExerciseBlock = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const block = await updateExerciseInBlock(
      req.params.id,
      req.params.blockId,
      req.body.exerciseId,
      req.body.updates,
    );
    res.json({ success: true, data: block });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /trainers/:id/blocks/:blockId/exercises — Add exercise
// ─────────────────────────────────────────────────────────────

export const addExerciseToBlock = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const block = await addExerciseToBlockService(
      req.params.id,
      req.params.blockId,
      req.body,
    );
    res.status(201).json({ success: true, data: block });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /trainers/:id/blocks/:blockId/exercises/:exerciseId
// ─────────────────────────────────────────────────────────────

export const updateExercise = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const exercise = await updateExerciseInBlock(
      req.params.id,
      req.params.blockId,
      req.params.exerciseId,
      req.body,
    );
    res.json({ success: true, data: exercise });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /trainers/:id/blocks/:blockId
// ─────────────────────────────────────────────────────────────

export const deleteExerciseBlock = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await deleteExerciseBlockService(req.params.id, req.params.blockId);
    res.json({ success: true, message: "Block deleted" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
