import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import {
  getSteps,
  createStep,
  updateStep,
  deleteStep,
} from "./exerciseStep.controller";

const router = Router({ mergeParams: true }); // mergeParams to get :exerciseId from parent

// GET    /exercises/:exerciseId/steps
// POST   /exercises/:exerciseId/steps
// PUT    /exercises/:exerciseId/steps/:stepId
// DELETE /exercises/:exerciseId/steps/:stepId

router.get("/", getSteps);
router.post("/", guardRole(["trainer"]), createStep);
router.put("/:stepId", guardRole(["trainer"]), updateStep);
router.delete("/:stepId", guardRole(["trainer"]), deleteStep);

export const ExerciseStepRoutes = router;
