import { Request, Response } from "express";
import * as exerciseService from "./exercise.service";

// GET /blocks/:blockId/exercises
export const getExercises = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const exercises = await exerciseService.getExercisesByBlock(
      req.params.blockId,
    );
    res.json({ success: true, data: exercises });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /blocks/:blockId/exercises/:exerciseId
export const getExercise = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const exercise = await exerciseService.getExerciseById(
      req.params.exerciseId,
    );
    res.json({ success: true, data: exercise });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// POST /blocks/:blockId/exercises
export const createExercise = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { trainerId } = req.body;
    if (!trainerId) {
      res
        .status(400)
        .json({ success: false, message: "trainerId is required" });
      return;
    }

    const exercise = await exerciseService.createExercise(
      req.params.blockId,
      trainerId,
      req.body,
    );
    res.status(201).json({ success: true, data: exercise });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /blocks/:blockId/exercises/:exerciseId
export const updateExercise = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const exercise = await exerciseService.updateExercise(
      req.params.exerciseId,
      req.body,
    );
    res.json({ success: true, data: exercise });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /blocks/:blockId/exercises/:exerciseId
export const deleteExercise = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await exerciseService.deleteExercise(req.params.exerciseId);
    res.json({ success: true, message: "Exercise deleted" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
