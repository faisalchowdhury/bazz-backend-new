import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import { trainerOnly } from "../../middlewares/auth";
import {
  getAllTrainers,
  getTrainer,
  getTrainerFull,
  getTrainersBySpecialty,
  getExerciseLibrary,
  createTrainer,
  updateTrainer,
  deleteTrainer,
} from "./trainer.controller";
import { trainerBlockSubRoutes } from "../exerciseBlock/exerciseBlock.route";
import { TrainerKnowledgePackRoutes } from "../trainerKnowladge/trainerKnowladge.route";

const router = Router();

// ── Public routes ──────────────────────────────────────────────
// GET /trainers
router.get("/", getAllTrainers);

// GET /trainers/specialty/:specialty   ← must be BEFORE /:id
router.get("/specialty/:specialty", getTrainersBySpecialty);

// GET /trainers/:id
router.get("/:id", getTrainer);

// GET /trainers/:id/full  (trainer + knowledgePack + blocks + exercises + steps)
router.get("/:id/full", getTrainerFull);

// GET /trainers/:id/blocks
router.get("/:id/blocks", getExerciseLibrary);

// ── Protected trainer routes ───────────────────────────────────
// POST /trainers
router.post("/", guardRole(["trainer"]), createTrainer);

// PUT /trainers/:id
router.put("/:id", guardRole(["trainer"]), updateTrainer);

// DELETE /trainers/:id
router.delete("/:id", trainerOnly as any, deleteTrainer);

// ── Nested: /trainers/:id/blocks/...  ─────────────────────────
// POST   /trainers/:id/blocks
// POST   /trainers/:id/blocks/generate
// PUT    /trainers/:id/blocks/:blockId/approve
// PUT    /trainers/:id/blocks/:blockId
// DELETE /trainers/:id/blocks/:blockId
// POST   /trainers/:id/blocks/:blockId/exercises
// PUT    /trainers/:id/blocks/:blockId/exercises/:exerciseId
// DELETE /trainers/:id/blocks/:blockId/exercises/:exerciseId
router.use("/:id/blocks", trainerBlockSubRoutes);

// ── Nested: /trainers/:id/knowledge-pack/... ──────────────────
// GET    /trainers/:id/knowledge-pack
// POST   /trainers/:id/knowledge-pack
// PUT    /trainers/:id/knowledge-pack
// PATCH  /trainers/:id/knowledge-pack
// DELETE /trainers/:id/knowledge-pack
router.use("/:id/knowledge-pack", TrainerKnowledgePackRoutes);

export const TrainerRoutes = router;
