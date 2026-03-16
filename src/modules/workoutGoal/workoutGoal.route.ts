import { Router } from "express";
import { protect } from "../../middlewares/auth";
import {
  completeExercise,
  completeSession,
  createWorkout,
  deleteWorkout,
  generatePlan,
  getTodaysWorkout,
  getUserWorkouts,
  getWorkout,
  skipSession,
  startSession, // ← imported from controller, NOT from mongoose
} from "./workoutGoal.controller";

const router = Router();

// All workout routes require authentication
router.use(protect as any);

// ── Workout preferences ───────────────────────────────────────
// POST   /workouts              → save preferences (no AI yet)
// GET    /workouts              → get all user workouts
// GET    /workouts/today        → get today's workout (before /:id)
// GET    /workouts/:id          → get single workout
// DELETE /workouts/:id          → delete pending workout

router.post("/", createWorkout);
router.get("/", getUserWorkouts);
router.get("/today", getTodaysWorkout); // ← must stay before /:id
router.get("/:id", getWorkout);
router.delete("/:id", deleteWorkout);

// ── AI Plan generation ────────────────────────────────────────
// POST /workouts/:id/generate → trigger AI to generate plan

router.post("/:id/generate", generatePlan);

// ── Session lifecycle ─────────────────────────────────────────
// PATCH  /workouts/:id/start
// PATCH  /workouts/:id/exercises/:exerciseId/complete
// POST   /workouts/:id/complete
// PATCH  /workouts/:id/skip

router.patch("/:id/start", startSession);
router.patch("/:id/exercises/:exerciseId/complete", completeExercise);
router.post("/:id/complete", completeSession);
router.patch("/:id/skip", skipSession);

export const WorkoutRoutes = router;
