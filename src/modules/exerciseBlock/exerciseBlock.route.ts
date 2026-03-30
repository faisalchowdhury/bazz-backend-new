import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import {
  getBlock,
  createExerciseBlock,
  generateExerciseBlock,
  approveExerciseBlock,
  updateExerciseBlock,
  deleteExerciseBlock,
} from "./exerciseBlock.controller";
import { ExerciseRoutes } from "../exercise/exercise.route";

// Standalone block routes (mounted at /blocks)
const router = Router();

// GET    /blocks/:blockId
router.get("/:blockId", getBlock);

// Nest exercise routes under blocks
// GET    /blocks/:blockId/exercises
// POST   /blocks/:blockId/exercises
// PUT    /blocks/:blockId/exercises/:exerciseId
// DELETE /blocks/:blockId/exercises/:exerciseId
router.use("/:blockId/exercises", ExerciseRoutes);

export const ExerciseBlockStandaloneRoutes = router;

// ── Routes nested under /trainers/:id/blocks ──────────────────
// These are exported separately to be mounted inside TrainerRoutes
export const trainerBlockSubRoutes = Router({ mergeParams: true });

// GET    /trainers/:id/blocks           (handled in trainer.controller)
// POST   /trainers/:id/blocks
trainerBlockSubRoutes.post("/", guardRole(["trainer"]), createExerciseBlock);

// POST   /trainers/:id/blocks/generate  ← must be before /:blockId
trainerBlockSubRoutes.post(
  "/generate",
  guardRole(["trainer"]),
  generateExerciseBlock,
);

// PUT    /trainers/:id/blocks/:blockId/approve
trainerBlockSubRoutes.put(
  "/:blockId/approve",
  guardRole(["trainer"]),
  approveExerciseBlock,
);

// PUT    /trainers/:id/blocks/:blockId
trainerBlockSubRoutes.put(
  "/:blockId",
  guardRole(["trainer"]),
  updateExerciseBlock,
);

// DELETE /trainers/:id/blocks/:blockId
trainerBlockSubRoutes.delete(
  "/:blockId",
  guardRole(["trainer"]),
  deleteExerciseBlock,
);

export const ExerciseBlockRoutes = trainerBlockSubRoutes;
