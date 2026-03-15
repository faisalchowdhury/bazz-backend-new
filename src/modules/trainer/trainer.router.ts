import { Router } from "express";

import {
  getAllTrainers,
  getTrainer,
  getTrainersBySpecialty,
  createTrainer,
  updateTrainer,
  getExerciseLibrary,
  createExerciseBlock,
  generateExerciseBlock,
  approveExerciseBlock,
  updateExerciseBlock,
  addExerciseToBlock,
  updateExercise,
  deleteExerciseBlock,
} from "./trainer.controller";
import { protect, trainerOnly } from "../../middlewares/auth";
import { guardRole } from "../../middlewares/roleGuard";

const router = Router();

// ── Public routes ─────────────────────────────────────────────
router.get("/", getAllTrainers);
router.get("/specialty/:specialty", getTrainersBySpecialty); // before /:id
router.get("/:id", getTrainer);
router.get("/:id/blocks", getExerciseLibrary);

// ── Protected trainer routes ──────────────────────────────────
router.post("/", guardRole(["trainer"]), createTrainer);
router.put("/:id", guardRole("trainer"), updateTrainer);

// ── Exercise block routes (trainer only) ──────────────────────
router.post(
  "/:id/blocks",
  protect as any,
  trainerOnly as any,
  createExerciseBlock,
);
router.post(
  "/:id/blocks/generate",
  guardRole(["trainer"]),
  generateExerciseBlock,
);
router.put(
  "/:id/blocks/:blockId/approve",
  protect as any,
  trainerOnly as any,
  approveExerciseBlock,
);
router.put(
  "/:id/blocks/:blockId",
  protect as any,
  trainerOnly as any,
  updateExerciseBlock,
);
router.delete(
  "/:id/blocks/:blockId",
  protect as any,
  trainerOnly as any,
  deleteExerciseBlock,
);

// ── Exercise routes within a block ────────────────────────────
router.post(
  "/:id/blocks/:blockId/exercises",
  protect as any,
  trainerOnly as any,
  addExerciseToBlock,
);
router.put(
  "/:id/blocks/:blockId/exercises/:exerciseId",
  protect as any,
  trainerOnly as any,
  updateExercise,
);

export const TrainerRoutes = router;
