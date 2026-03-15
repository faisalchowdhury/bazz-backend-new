import {
  buildExerciseBlockGenerationPrompt,
  callAI,
} from "../../services/ai.service";
import {
  IExercise,
  IExerciseBlock,
  ITrainer,
  TrainerModel,
} from "./trainer.model";

// ─────────────────────────────────────────────────────────────
// GET ALL TRAINERS (browse / discovery)
// ─────────────────────────────────────────────────────────────

export const getAllTrainers = async (
  filters: {
    specialty?: string;
    isVerified?: boolean;
  } = {},
) => {
  const query: any = { isActive: true };
  if (filters.specialty) query.specialty = filters.specialty;
  if (filters.isVerified) query.isVerified = true;

  return await TrainerModel.find(query)
    .select(
      "name specialty certifications trainingStyleTags profileImage subscriptionPrice subscriberCount bio",
    )
    .lean();
};

// ─────────────────────────────────────────────────────────────
// GET SINGLE TRAINER
// ─────────────────────────────────────────────────────────────

export const getTrainerById = async (trainerId: string) => {
  return await TrainerModel.findById(trainerId)
    .populate("userId", "name email")
    .lean();
};

// ─────────────────────────────────────────────────────────────
// GET TRAINER BY SPECIALTY (auto-assign at onboarding)
// ─────────────────────────────────────────────────────────────

export const getTrainerBySpecialty = async (specialty: string) => {
  return await TrainerModel.find({
    specialty,
    isActive: true,
    isVerified: true,
  })
    .select(
      "name specialty systemPrompt certifications profileImage trainingStyleTags knowledgePack",
    )
    .lean();
};

// ─────────────────────────────────────────────────────────────
// CREATE TRAINER PROFILE
// ─────────────────────────────────────────────────────────────

export const createTrainerService = async (
  userId: string,
  trainerData: Partial<ITrainer>,
): Promise<ITrainer> => {
  console.log(userId, "kire");
  const existing = await TrainerModel.findOne({ userId });
  if (existing) throw new Error("Trainer profile already exists for this user");

  const trainer = new TrainerModel({ userId, ...trainerData });
  return await trainer.save();
};

// ─────────────────────────────────────────────────────────────
// UPDATE TRAINER PROFILE / KNOWLEDGE PACK
// ─────────────────────────────────────────────────────────────

export const updateTrainer = async (
  trainerId: string,
  updates: Partial<ITrainer>,
) => {
  return await TrainerModel.findByIdAndUpdate(
    trainerId,
    { $set: updates },
    { new: true },
  );
};

// ─────────────────────────────────────────────────────────────
// GET TRAINER EXERCISE LIBRARY
// ─────────────────────────────────────────────────────────────

export const getTrainerExerciseLibrary = async (
  trainerId: string,
  filters: { category?: string; approvedOnly?: boolean } = {},
) => {
  const trainer = await TrainerModel.findById(trainerId)
    .select("exerciseBlocks name specialty")
    .lean();

  if (!trainer) throw new Error("Trainer not found");

  let blocks = trainer.exerciseBlocks as IExerciseBlock[];

  if (filters.category) {
    blocks = blocks.filter((b) => b.category === filters.category);
  }
  if (filters.approvedOnly) {
    blocks = blocks.filter((b) => b.isApproved === true);
  }

  return blocks;
};

// ─────────────────────────────────────────────────────────────
// CREATE EXERCISE BLOCK (manual)
// ─────────────────────────────────────────────────────────────

export const createExerciseBlock = async (
  trainerId: string,
  blockData: Partial<IExerciseBlock>,
) => {
  const trainer = await TrainerModel.findById(trainerId);
  if (!trainer) throw new Error("Trainer not found");

  trainer.exerciseBlocks.push({
    ...blockData,
    isAiGenerated: false,
    isApproved: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as IExerciseBlock);

  await trainer.save();
  return trainer.exerciseBlocks[trainer.exerciseBlocks.length - 1];
};

// ─────────────────────────────────────────────────────────────
// GENERATE EXERCISE BLOCK WITH AI
// Trainer: "Generate 20 upper body exercises for maintenance clients"
// AI generates → trainer reviews → trainer approves
// ─────────────────────────────────────────────────────────────

export const generateExerciseBlockWithAI = async (
  trainerId: string,
  request: {
    blockName: string;
    category: string;
    count: number;
    context?: string;
    // etA; // Removed unused or mistyped property
  },
) => {
  const trainer = await TrainerModel.findById(trainerId).lean();
  if (!trainer) throw new Error("Trainer not found");

  const { blockName, category, count, context } = request;

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
    maxTokens: 4000,
  });

  let generatedBlock: any;
  try {
    const clean = aiResponse.replace(/```json|```/g, "").trim();
    generatedBlock = JSON.parse(clean);
  } catch {
    throw new Error(
      "AI returned invalid JSON for exercise block. Please try again.",
    );
  }

  // Save as pending approval — trainer must review before it goes live
  const trainer2 = await TrainerModel.findById(trainerId);
  if (!trainer2) throw new Error("Trainer not found");

  trainer2.exerciseBlocks.push({
    name: blockName,
    description: generatedBlock.description || "",
    category,
    exercises: generatedBlock.exercises || [],
    isAiGenerated: true,
    isApproved: false, // trainer must approve
    createdAt: new Date(),
    updatedAt: new Date(),
  } as IExerciseBlock);

  await trainer2.save();

  return trainer2.exerciseBlocks[trainer2.exerciseBlocks.length - 1];
};

// ─────────────────────────────────────────────────────────────
// APPROVE AI-GENERATED BLOCK
// ─────────────────────────────────────────────────────────────

export const approveExerciseBlock = async (
  trainerId: string,
  blockId: string,
) => {
  const trainer = await TrainerModel.findById(trainerId);
  if (!trainer) throw new Error("Trainer not found");

  const block = (trainer.exerciseBlocks as any).id(blockId);
  if (!block) throw new Error("Block not found");

  block.isApproved = true;
  block.updatedAt = new Date();
  await trainer.save();
  return block;
};

// ─────────────────────────────────────────────────────────────
// UPDATE EXERCISE BLOCK
// ─────────────────────────────────────────────────────────────

export const updateExerciseBlock = async (
  trainerId: string,
  blockId: string,
  updates: Partial<IExerciseBlock>,
) => {
  const trainer = await TrainerModel.findById(trainerId);
  if (!trainer) throw new Error("Trainer not found");

  const block = (trainer.exerciseBlocks as any).id(blockId);
  if (!block) throw new Error("Block not found");

  Object.assign(block, { ...updates, updatedAt: new Date() });
  await trainer.save();
  return block;
};

// ─────────────────────────────────────────────────────────────
// ADD EXERCISE TO BLOCK
// ─────────────────────────────────────────────────────────────

export const addExerciseToBlockService = async (
  trainerId: string,
  blockId: string,
  exerciseData: any,
) => {
  const trainer = await TrainerModel.findById(trainerId);
  if (!trainer) throw new Error("Trainer not found");

  const block = (trainer.exerciseBlocks as any).id(blockId);
  if (!block) throw new Error("Block not found");

  block.exercises.push(exerciseData);
  block.updatedAt = new Date();
  await trainer.save();
  return block;
};

// ─────────────────────────────────────────────────────────────
// UPDATE EXERCISE IN BLOCK
// ─────────────────────────────────────────────────────────────

export const updateExerciseInBlock = async (
  trainerId: string,
  blockId: string,
  exerciseId: string,
  updates: Partial<IExercise>,
) => {
  const trainer = await TrainerModel.findById(trainerId);
  if (!trainer) throw new Error("Trainer not found");

  const block = (trainer.exerciseBlocks as any).id(blockId);
  if (!block) throw new Error("Block not found");

  const exercise = block.exercises.id(exerciseId);
  if (!exercise) throw new Error("Exercise not found");

  Object.assign(exercise, updates);
  block.updatedAt = new Date();
  await trainer.save();
  return exercise;
};

// ─────────────────────────────────────────────────────────────
// DELETE EXERCISE BLOCK
// ─────────────────────────────────────────────────────────────

export const deleteExerciseBlock = async (
  trainerId: string,
  blockId: string,
) => {
  await TrainerModel.findByIdAndUpdate(trainerId, {
    $pull: { exerciseBlocks: { _id: blockId } },
  });
  return { message: "Block deleted" };
};
