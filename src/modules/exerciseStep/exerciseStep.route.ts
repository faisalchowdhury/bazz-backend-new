import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import {
  getSteps,
  createStep,
  updateStep,
  deleteStep,
} from "./exerciseStep.controller";

const router = Router(); // mergeParams to get :exerciseId from parent

// GET    /exercises/:exerciseId/steps
// POST   /exercises/:exerciseId/steps
// PUT    /exercises/:exerciseId/steps/:stepId
// DELETE /exercises/:exerciseId/steps/:stepId

router.get("/:exerciseId", getSteps);
router.post("/:exerciseId", guardRole(["trainer"]), createStep);
router.put("/:exerciseId/:stepId", guardRole(["trainer"]), updateStep);
router.delete("/:exerciseId/:stepId", guardRole(["trainer"]), deleteStep);

export const ExerciseStepRoutes = router;
