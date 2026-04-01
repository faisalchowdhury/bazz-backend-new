import { ExerciseBlockModel } from "./exerciseBlock.model";
import { IExerciseBlock } from "./exerciseBlock.interface";
import {
  getExercisesByBlock,
  bulkCreateExercises,
  deleteExercisesByBlock,
  approveExercisesByBlock,
} from "../exercise/exercise.service";
import {
  callAI,
  buildExerciseBlockGenerationPrompt,
} from "../../services/ai.service";
import { TrainerModel } from "../trainer/trainer.model";

// ── Get all blocks for a trainer (with exercises + steps) ──────
export const getBlocksByTrainer = async (
  trainerId: string,
  filters: { category?: string; approvedOnly?: boolean } = {},
) => {
  const query: any = { trainerId };
  if (filters.category) query.category = filters.category;
  if (filters.approvedOnly) query.isApproved = true;

  const blocks = await ExerciseBlockModel.find(query).lean();

  // Populate exercises + steps for each block
  const populated = await Promise.all(
    blocks.map(async (block) => {
      const exercises = await getExercisesByBlock(block._id.toString());
      return { ...block, exercises };
    }),
  );

  return populated;
};

// ── Get single block with exercises + steps ───────────────────
export const getBlockById = async (blockId: string) => {
  const block = await ExerciseBlockModel.findById(blockId).lean();
  if (!block) throw new Error("Block not found");

  const exercises = await getExercisesByBlock(blockId);
  return { ...block, exercises };
};

// ── Create block manually ─────────────────────────────────────
export const createBlock = async (
  trainerId: string,
  data: Partial<IExerciseBlock> & { exercises?: any[] },
) => {
  const { exercises, ...blockData } = data;

  const block = await ExerciseBlockModel.create({
    trainerId,
    ...blockData,
    isAiGenerated: false,
    isApproved: true,
  });

  const blockId = String((block as any)._id);

  // Create exercises if provided in the body
  if (exercises && exercises.length > 0) {
    await bulkCreateExercises(blockId, trainerId, exercises, false);
  }

  return getBlockById(blockId);
};

// ── Generate block with AI ────────────────────────────────────
// Trainer asks: "Generate 20 upper body exercises"
// AI generates → saved as isApproved: false → trainer reviews → approves
export const generateBlockWithAI = async (
  trainerId: string,
  request: {
    blockName: string;
    category: string;
    count: number;
    context?: string;
  },
) => {
  const trainer = await TrainerModel.findById(trainerId).lean();
  if (!trainer) throw new Error("Trainer not found");

  const { blockName, category, count, context } = request;

  // Build prompt using trainer's knowledge pack preferences
  const prompt = buildExerciseBlockGenerationPrompt(
    trainer,
    blockName,
    category,
    count,
    context,
  );

  const aiResponse = await callAI({
    systemPrompt: `You are a professional fitness programming assistant helping trainer ${trainer.name} build their exercise library. Output ONLY valid JSON. No explanation. No markdown. No backticks.`,
    userMessage: prompt,
    maxTokens: 10000,
  });

  // Parse AI response
  let generated: any;
  try {
    const clean = aiResponse.replace(/```json|```/g, "").trim();
    generated = JSON.parse(clean);
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  // 1. Create the block (not approved yet)
  const block = await ExerciseBlockModel.create({
    trainerId,
    name: blockName,
    description: generated.description || "",
    category,
    isAiGenerated: true,
    isApproved: false, // ← trainer must approve
  });

  const blockId = String((block as any)._id);

  // 2. Create exercises + steps in separate collections
  if (generated.exercises && generated.exercises.length > 0) {
    await bulkCreateExercises(
      blockId,
      trainerId,
      generated.exercises,
      true, // isAiGenerated = true
    );
  }

  return getBlockById(blockId);
};

// ── Approve block + all its exercises ────────────────────────
export const approveBlock = async (blockId: string) => {
  const block = await ExerciseBlockModel.findByIdAndUpdate(
    blockId,
    { $set: { isApproved: true } },
    { new: true },
  );
  if (!block) throw new Error("Block not found");

  // Also approve all exercises in this block
  await approveExercisesByBlock(blockId);

  return getBlockById(blockId);
};

// ── Update block metadata ─────────────────────────────────────
export const updateBlock = async (
  blockId: string,
  updates: Partial<IExerciseBlock>,
) => {
  // Never allow updating trainerId or isAiGenerated through this method
  delete (updates as any).trainerId;
  delete (updates as any).isAiGenerated;

  const block = await ExerciseBlockModel.findByIdAndUpdate(
    blockId,
    { $set: updates },
    { new: true },
  );
  if (!block) throw new Error("Block not found");

  return getBlockById(blockId);
};

// ── Delete block + all exercises + all steps ──────────────────
export const deleteBlock = async (blockId: string) => {
  await deleteExercisesByBlock(blockId);
  await ExerciseBlockModel.findByIdAndDelete(blockId);
  return { message: "Block, exercises, and steps deleted" };
};
