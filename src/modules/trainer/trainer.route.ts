import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import { protect, trainerOnly } from "../../middlewares/auth";
import {
  getAllTrainers,
  getTrainer,
  getMyTrainer,
  getTrainerByUser,
  getTrainerFull,
  getTrainersBySpecialty,
  getExerciseLibrary,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  getTrainerDashboardStats,
} from "./trainer.controller";
import { removePersona, setPersonaId } from "../anam/anam.controller";
import { trainerBlockSubRoutes } from "../exerciseBlock/exerciseBlock.route";
import { TrainerKnowledgePackRoutes } from "../trainerKnowladge/trainerKnowladge.route";

const router = Router();

// ── Public routes ──────────────────────────────────────────────
router.get("/", getAllTrainers);
router.get("/specialty/:specialty", getTrainersBySpecialty); // before /:id
router.get("/me", guardRole(["trainer"]), getMyTrainer); // userId from JWT
router.get("/me/dashboard-stats", guardRole(["trainer"]), getTrainerDashboardStats);
router.get("/user/:userId", getTrainerByUser); // lookup by user account id
router.get("/:id", getTrainer);
router.get("/:id/full", getTrainerFull);
router.get("/:id/blocks", getExerciseLibrary);

// ── Protected trainer routes ───────────────────────────────────
router.post("/", guardRole(["trainer"]), createTrainer);
router.put("/:id", guardRole(["trainer"]), updateTrainer);
router.delete("/:id", protect as any, trainerOnly as any, deleteTrainer);

// ── Anam AI persona (new) ──────────────────────────────────────
// PUT    /trainers/:id/anam   → trainer sets their personaId
// DELETE /trainers/:id/anam   → trainer removes their persona
router.put("/:id/anam", guardRole(["trainer"]), setPersonaId);
router.delete("/:id/anam", guardRole(["trainer"]), removePersona);

// ── Nested: blocks ────────────────────────────────────────────
router.use("/:id/blocks", trainerBlockSubRoutes);

// ── Nested: knowledge-pack ────────────────────────────────────
router.use("/:id/knowledge-pack", TrainerKnowledgePackRoutes);

export const TrainerRoutes = router;
