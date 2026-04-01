import { Request, Response } from "express";
import {
  completeExerciseService,
  completeSessionService,
  createWorkoutPreferences,
  deleteWorkoutService,
  generateAIPlan,
  getTodaysWorkoutService,
  getUserWorkoutsService,
  getWorkoutByIdService,
  skipSessionService,
  startSessionService,
} from "./workoutGoal.service";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";

// ─────────────────────────────────────────────────────────────
// POST /workouts
// User fills preferences form and saves it — no AI plan yet
// ─────────────────────────────────────────────────────────────

export const createWorkout = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      goal,
      focusArea,
      workout_environment,
      equipment_availablity,
      workout_intensity,
      duration,
      date,
    } = req.body;

    const userId = (req.user as JwtPayloadWithUser).id;
    if (
      !goal ||
      !focusArea ||
      !workout_environment ||
      !equipment_availablity ||
      !workout_intensity ||
      !duration ||
      !date
    ) {
      res.status(400).json({
        success: false,
        message:
          "All fields are required: goal, focusArea, workout_environment, equipment_availablity, workout_intensity, duration, date",
      });
      return;
    }

    const workout = await createWorkoutPreferences(userId, {
      goal,
      focusArea,
      workout_environment,
      equipment_availablity,
      workout_intensity,
      duration,
      date,
    });

    res.status(201).json({
      success: true,
      message: "Workout preferences saved. Call /generate to get your AI plan.",
      data: workout,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /workouts/:id/generate
// Triggers AI — reads preferences + trainer blocks + user memory
// ─────────────────────────────────────────────────────────────

export const generatePlan = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const workout = await generateAIPlan(userId, req.params.id);

    res.status(200).json({
      success: true,
      message: "Your AI workout plan is ready!",
      data: workout,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /workouts/:id/start
// ─────────────────────────────────────────────────────────────

export const startSession = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const workout = await startSessionService(userId, req.params.id);

    res.status(200).json({
      success: true,
      message: "Session started. Let's go!",
      data: workout,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /workouts/:id/exercises/:exerciseId/complete
// ─────────────────────────────────────────────────────────────

export const completeExercise = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const { completedSets, actualWeight, actualRpe, notes } = req.body;

    const workout = await completeExerciseService(
      userId,
      req.params.id,
      req.params.exerciseId,
      { completedSets, actualWeight, actualRpe, notes },
    );

    res.status(200).json({
      success: true,
      message: "Exercise logged",
      data: workout,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /workouts/:id/complete
// Finish session + answer check-in + update memory
// ─────────────────────────────────────────────────────────────

export const completeSession = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { checkInResponse, actualDurationMinutes } = req.body;
    const userId = (req.user as JwtPayloadWithUser).id;
    if (!checkInResponse) {
      res.status(400).json({
        success: false,
        message: "checkInResponse is required to complete the session",
      });
      return;
    }

    const result = await completeSessionService(
      userId,
      req.params.id,
      checkInResponse,
      actualDurationMinutes,
    );

    res.status(200).json({
      success: true,
      message: "Session completed and memory updated. Great work!",
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /workouts/:id/skip
// ─────────────────────────────────────────────────────────────

export const skipSession = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const workout = await skipSessionService(userId, req.params.id);

    res.status(200).json({
      success: true,
      message: "Session skipped",
      data: workout,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /workouts
// ─────────────────────────────────────────────────────────────

export const getUserWorkouts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { status, limit } = req.query;
    const userId = (req.user as JwtPayloadWithUser).id;
    const workouts = await getUserWorkoutsService(userId, {
      status: status as string | undefined,
      limit: limit ? parseInt(limit as string) : 20,
    });

    res.status(200).json({ success: true, data: workouts });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /workouts/today
// ─────────────────────────────────────────────────────────────

export const getTodaysWorkout = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const workout = await getTodaysWorkoutService(userId);

    if (!workout) {
      res
        .status(404)
        .json({ success: false, message: "No workout found for today" });
      return;
    }

    res.status(200).json({ success: true, data: workout });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /workouts/:id
// ─────────────────────────────────────────────────────────────

export const getWorkout = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const workout = await getWorkoutByIdService(userId, req.params.id);

    if (!workout) {
      res.status(404).json({ success: false, message: "Workout not found" });
      return;
    }

    res.status(200).json({ success: true, data: workout });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /workouts/:id
// ─────────────────────────────────────────────────────────────

export const deleteWorkout = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    await deleteWorkoutService(userId, req.params.id);

    res.status(200).json({ success: true, message: "Workout deleted" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
