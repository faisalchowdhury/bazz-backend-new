import { Request, Response } from "express";
import * as blockService from "./exerciseBlock.service";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";

// GET /trainers/:id/blocks
export const getExerciseLibrary = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { category, approvedOnly } = req.query;
    const blocks = await blockService.getBlocksByTrainer(req.params.id, {
      category: category as string | undefined,
      approvedOnly: approvedOnly === "true",
    });
    res.json({ success: true, data: blocks });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /blocks/:blockId
export const getBlock = async (req: Request, res: Response): Promise<void> => {
  try {
    const block = await blockService.getBlockById(req.params.blockId);
    res.json({ success: true, data: block });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// POST /trainers/:id/blocks  — manual creation
export const createExerciseBlock = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const block = await blockService.createBlock(req.params.id, req.body);
    res.status(201).json({ success: true, data: block });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /trainers/:id/blocks/generate  — AI generation
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

    const block = await blockService.generateBlockWithAI(req.params.id, {
      blockName,
      category,
      count: parseInt(count),
      context,
    });

    res.status(201).json({
      success: true,
      message: "Block generated. Review and approve before it goes live.",
      data: block,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /trainers/:id/blocks/:blockId/approve
export const approveExerciseBlock = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const block = await blockService.approveBlock(req.params.blockId);
    res.json({
      success: true,
      message: "Block and exercises approved",
      data: block,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /trainers/:id/blocks/:blockId
export const updateExerciseBlock = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const block = await blockService.updateBlock(req.params.blockId, req.body);
    res.json({ success: true, data: block });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /trainers/:id/blocks/:blockId
export const deleteExerciseBlock = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await blockService.deleteBlock(req.params.blockId);
    res.json({ success: true, message: "Block, exercises, and steps deleted" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
