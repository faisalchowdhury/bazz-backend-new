import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import {
  getExercises,
  getExercise,
  createExercise,
  updateExercise,
  deleteExercise,
} from "./exercise.controller";

// Mounted at /blocks/:blockId/exercises (mergeParams = true)
const router = Router({ mergeParams: true });

// GET    /blocks/:blockId/exercises
// GET    /blocks/:blockId/exercises/:exerciseId
// POST   /blocks/:blockId/exercises
// PUT    /blocks/:blockId/exercises/:exerciseId
// DELETE /blocks/:blockId/exercises/:exerciseId

router.get("/", getExercises);
router.get("/:exerciseId", getExercise);
router.post("/", guardRole(["trainer"]), createExercise);
router.put("/:exerciseId", guardRole(["trainer"]), updateExercise);
router.delete("/:exerciseId", guardRole(["trainer"]), deleteExercise);

export const ExerciseRoutes = router;
