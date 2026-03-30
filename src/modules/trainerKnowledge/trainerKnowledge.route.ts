import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import {
  createKnowledgePack,
  deleteKnowledgePack,
  getKnowledgePack,
  updateKnowledgePack,
  upsertKnowledgePack,
} from "./trainerKnowledge.controller";

// Mounted under /trainers/:id/knowledge-pack (mergeParams = true)
const router = Router({ mergeParams: true });

// GET    /trainers/:id/knowledge-pack  — public (users see trainer philosophy)
// POST   /trainers/:id/knowledge-pack  — trainer only (first time create)
// PUT    /trainers/:id/knowledge-pack  — trainer only (upsert)
// PATCH  /trainers/:id/knowledge-pack  — trainer only (partial update)
// DELETE /trainers/:id/knowledge-pack  — trainer only

router.get("/", getKnowledgePack);
router.post("/", guardRole(["trainer"]), createKnowledgePack);
router.put("/", guardRole(["trainer"]), upsertKnowledgePack);
router.patch("/", guardRole(["trainer"]), updateKnowledgePack);
router.delete("/", guardRole(["trainer"]), deleteKnowledgePack);

export const TrainerKnowledgePackRoutes = router;
