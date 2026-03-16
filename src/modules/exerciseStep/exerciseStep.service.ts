import { IExerciseStep } from "./exerciseSetp.interface";
import { ExerciseStepModel } from "./exerciseStep.model";

// ── Get all steps for an exercise ──────────────────────────────
export const getStepsByExercise = async (exerciseId: string) => {
  return await ExerciseStepModel.find({ exerciseId }).sort({ order: 1 }).lean();
};

// ── Create a single step ───────────────────────────────────────
export const createStep = async (
  exerciseId: string,
  data: Pick<IExerciseStep, "order" | "instruction" | "duration" | "tip">,
) => {
  return await ExerciseStepModel.create({ exerciseId, ...data });
};

// ── Bulk create steps (used when creating an exercise) ─────────
export const bulkCreateSteps = async (
  exerciseId: string,
  steps: Pick<IExerciseStep, "order" | "instruction" | "duration" | "tip">[],
) => {
  if (!steps || steps.length === 0) return [];
  const docs = steps.map((s) => ({ exerciseId, ...s }));
  return await ExerciseStepModel.insertMany(docs);
};

// ── Update a step ──────────────────────────────────────────────
export const updateStep = async (
  stepId: string,
  updates: Partial<
    Pick<IExerciseStep, "order" | "instruction" | "duration" | "tip">
  >,
) => {
  const step = await ExerciseStepModel.findByIdAndUpdate(
    stepId,
    { $set: updates },
    { new: true },
  );
  if (!step) throw new Error("Step not found");
  return step;
};

// ── Delete a step ──────────────────────────────────────────────
export const deleteStep = async (stepId: string) => {
  await ExerciseStepModel.findByIdAndDelete(stepId);
  return { message: "Step deleted" };
};

// ── Delete all steps for an exercise (used when deleting exercise) ─
export const deleteStepsByExercise = async (exerciseId: string) => {
  await ExerciseStepModel.deleteMany({ exerciseId });
};
