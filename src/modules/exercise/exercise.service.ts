import { ExerciseModel } from "./exercise.model";
import { IExercise } from "./exercise.interface";
import {
  bulkCreateSteps,
  deleteStepsByExercise,
  getStepsByExercise,
} from "../exerciseStep/exerciseStep.service";

// ── Get all exercises for a block (with steps populated) ───────
export const getExercisesByBlock = async (blockId: string) => {
  const exercises = await ExerciseModel.find({ blockId }).lean();

  // Attach steps to each exercise
  const withSteps = await Promise.all(
    exercises.map(async (ex) => {
      const steps = await getStepsByExercise(ex._id.toString());
      return { ...ex, steps };
    }),
  );

  return withSteps;
};

// ── Get single exercise with steps ────────────────────────────
export const getExerciseById = async (exerciseId: string) => {
  const exercise = await ExerciseModel.findById(exerciseId).lean();
  if (!exercise) throw new Error("Exercise not found");

  const steps = await getStepsByExercise(exerciseId);
  return { ...exercise, steps };
};

// ── Create exercise + its steps ────────────────────────────────
export const createExercise = async (
  blockId: string,
  trainerId: string,
  data: Partial<IExercise> & { steps?: any[] },
) => {
  const { steps, ...exerciseData } = data;

  const exercise = await ExerciseModel.create({
    blockId,
    trainerId,
    ...exerciseData,
    isAiGenerated: false,
    isApproved: true,
  });

  // Create steps if provided
  if (steps && steps.length > 0) {
    await bulkCreateSteps((exercise as any)._id.toString(), steps);
  }

  return getExerciseById((exercise as any)._id.toString());
};

// ── Bulk create exercises + steps (used by AI block generation) ─
export const bulkCreateExercises = async (
  blockId: string,
  trainerId: string,
  exercises: (Partial<IExercise> & { steps?: any[] })[],
  isAiGenerated = false,
) => {
  const created = [];

  for (const ex of exercises) {
    const { steps, ...exerciseData } = ex;

    const exercise = await ExerciseModel.create({
      blockId,
      trainerId,
      ...exerciseData,
      isAiGenerated,
      isApproved: !isAiGenerated, // AI-generated → needs approval
    });

    if (steps && steps.length > 0) {
      await bulkCreateSteps((exercise as any)._id.toString(), steps);
    }

    created.push((exercise as any)._id);
  }

  return created;
};

// ── Update exercise ────────────────────────────────────────────
export const updateExercise = async (
  exerciseId: string,
  updates: Partial<IExercise>,
) => {
  const exercise = await ExerciseModel.findByIdAndUpdate(
    exerciseId,
    { $set: updates },
    { new: true },
  );
  if (!exercise) throw new Error("Exercise not found");
  return getExerciseById(exerciseId);
};

// ── Delete exercise + all its steps ───────────────────────────
export const deleteExercise = async (exerciseId: string) => {
  await deleteStepsByExercise(exerciseId);
  await ExerciseModel.findByIdAndDelete(exerciseId);
  return { message: "Exercise and its steps deleted" };
};

// ── Delete all exercises in a block (used when deleting block) ─
export const deleteExercisesByBlock = async (blockId: string) => {
  const exercises = await ExerciseModel.find({ blockId }).select("_id").lean();

  for (const ex of exercises) {
    await deleteStepsByExercise(ex._id.toString());
  }

  await ExerciseModel.deleteMany({ blockId });
};

// ── Approve all exercises in a block ─────────────────────────
export const approveExercisesByBlock = async (blockId: string) => {
  await ExerciseModel.updateMany({ blockId }, { $set: { isApproved: true } });
};
