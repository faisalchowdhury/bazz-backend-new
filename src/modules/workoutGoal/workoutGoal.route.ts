import { Router } from "express";
import { protect } from "../../middlewares/auth";
import {
  completeExercise,
  completeSession,
  createWorkout,
  deleteWorkout,
  generatePlan,
  getTodaysWorkout,
  getTodaysOverview,
  getMonthlyProgression,
  getUserWorkouts,
  getWorkout,
  skipSession,
  startSession, // ← imported from controller, NOT from mongoose
} from "./workoutGoal.controller";
import { guardRole } from "../../middlewares/roleGuard";

const router = Router();

// All workout routes require authentication

// ── Workout preferences ───────────────────────────────────────
// POST   /workouts              → save preferences (no AI yet)
// GET    /workouts              → get all user workouts
// GET    /workouts/today        → get today's workout (before /:id)
// GET    /workouts/today/overview → get today's workout overview with completion percentage (before /:id)
// GET    /workouts/progression/monthly → get 30 days progression report (before /:id)
// GET    /workouts/:id          → get single workout
// DELETE /workouts/:id          → delete pending workout

router.post("/", guardRole("user"), createWorkout);
router.get("/", guardRole("user"), getUserWorkouts);
router.get("/today", guardRole("user"), getTodaysWorkout); // ← must stay before /:id
router.get("/today/overview", guardRole("user"), getTodaysOverview); // ← must stay before /:id
router.get("/progression/monthly", guardRole("user"), getMonthlyProgression); // ← must stay before /:id
router.get("/:id", guardRole("user"), getWorkout);
router.delete("/:id", guardRole("user"), deleteWorkout);

// ── AI Plan generation ────────────────────────────────────────
// POST /workouts/:id/generate → trigger AI to generate plan

router.post("/:id/generate", guardRole("user"), generatePlan);

// ── Session lifecycle ─────────────────────────────────────────
// PATCH  /workouts/:id/start
// PATCH  /workouts/:id/exercises/:exerciseId/complete
// POST   /workouts/:id/complete
// PATCH  /workouts/:id/skip

router.patch("/:id/start", guardRole("user"), startSession);
router.patch(
  "/:id/exercises/:exerciseId/complete",
  guardRole("user"),
  completeExercise,
);
router.post("/:id/complete", guardRole("user"), completeSession);
router.patch("/:id/skip", guardRole("user"), skipSession);

export const WorkoutRoutes = router;
