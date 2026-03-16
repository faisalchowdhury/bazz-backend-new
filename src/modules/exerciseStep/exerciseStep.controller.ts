import { Request, Response } from "express";
import * as stepService from "./exerciseStep.service";

// GET /exercises/:exerciseId/steps
export const getSteps = async (req: Request, res: Response): Promise<void> => {
  try {
    const steps = await stepService.getStepsByExercise(req.params.exerciseId);
    res.json({ success: true, data: steps });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /exercises/:exerciseId/steps
export const createStep = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const step = await stepService.createStep(req.params.exerciseId, req.body);
    res.status(201).json({ success: true, data: step });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /exercises/:exerciseId/steps/:stepId
export const updateStep = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const step = await stepService.updateStep(req.params.stepId, req.body);
    res.json({ success: true, data: step });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /exercises/:exerciseId/steps/:stepId
export const deleteStep = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await stepService.deleteStep(req.params.stepId);
    res.json({ success: true, message: "Step deleted" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
