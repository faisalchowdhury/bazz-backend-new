import { Request, Response } from "express";
import {
  createKnowledgePackService,
  deleteKnowledgePackService,
  getKnowledgePackService,
  updateKnowledgePackService,
  upsertKnowledgePackService,
} from "./trainerKnowledge.service";

// GET /trainers/:id/knowledge-pack
export const getKnowledgePack = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const pack = await getKnowledgePackService(req.params.id);
    if (!pack) {
      res
        .status(404)
        .json({ success: false, message: "Knowledge pack not found" });
      return;
    }
    res.json({ success: true, data: pack });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /trainers/:id/knowledge-pack
export const createKnowledgePack = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const pack = await createKnowledgePackService(req.params.id, req.body);
    res.status(201).json({ success: true, data: pack });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /trainers/:id/knowledge-pack  (upsert — create or update)
export const upsertKnowledgePack = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const pack = await upsertKnowledgePackService(req.params.id, req.body);
    res.json({ success: true, data: pack });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /trainers/:id/knowledge-pack  (partial update)
export const updateKnowledgePack = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const pack = await updateKnowledgePackService(req.params.id, req.body);
    res.json({ success: true, data: pack });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /trainers/:id/knowledge-pack
export const deleteKnowledgePack = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await deleteKnowledgePackService(req.params.id);
    res.json({ success: true, message: "Knowledge pack deleted" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
