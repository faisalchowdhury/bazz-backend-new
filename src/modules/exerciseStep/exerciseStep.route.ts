import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import {
  getSteps,
  createStep,
  updateStep,
  deleteStep,
} from "./exerciseStep.controller";

const router = Router(); // mergeParams to get :exerciseId from parent

// GET    /exercise/:exerciseId/steps
// POST   /exercise/:exerciseId/steps
// PUT    /exercise/:exerciseId/steps/:stepId
// DELETE /exercise/:exerciseId/steps/:stepId

router.get("/:exerciseId/steps", getSteps);
router.post("/:exerciseId/steps", guardRole(["trainer"]), createStep);
router.put("/:exerciseId/steps/:stepId", guardRole(["trainer"]), updateStep);
router.delete("/:exerciseId/steps/:stepId", guardRole(["trainer"]), deleteStep);

export const ExerciseStepRoutes = router;
