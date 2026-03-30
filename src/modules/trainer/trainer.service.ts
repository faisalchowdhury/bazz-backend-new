import { TrainerModel } from "./trainer.model";
import { ITrainer } from "./trainer.interface";
import { getBlocksByTrainer } from "../exerciseBlock/exerciseBlock.service";
import { getKnowledgePackService } from "../trainerKnowledge/trainerKnowledge.service";

// ─────────────────────────────────────────────────────────────
// GET ALL TRAINERS (browse / discovery)
// ─────────────────────────────────────────────────────────────

export const getAllTrainers = async (
  filters: { specialty?: string; isVerified?: boolean } = {},
) => {
  const query: any = { isActive: true };
  if (filters.specialty) query.specialty = filters.specialty;
  if (filters.isVerified !== undefined) query.isVerified = filters.isVerified;

  return await TrainerModel.find(query)
    .select(
      "name specialty certifications trainingStyleTags profileImage subscriptionPrice subscriberCount bio",
    )
    .lean();
};

// ─────────────────────────────────────────────────────────────
// GET SINGLE TRAINER (profile only — no blocks)
// ─────────────────────────────────────────────────────────────

export const getTrainerById = async (trainerId: string) => {
  return await TrainerModel.findById(trainerId)
    .populate("userId", "firstName lastName email")
    .lean();
};

// ─────────────────────────────────────────────────────────────
// GET TRAINER FULL PROFILE
// Trainer + knowledgePack + blocks + exercises + steps
// ─────────────────────────────────────────────────────────────

export const getTrainerFullProfile = async (trainerId: string) => {
  const trainer = await TrainerModel.findById(trainerId)
    .populate("userId", "firstName lastName email")
    .lean();

  if (!trainer) throw new Error("Trainer not found");

  const [knowledgePack, exerciseBlocks] = await Promise.all([
    getKnowledgePackService(trainerId),
    getBlocksByTrainer(trainerId),
  ]);

  return { ...trainer, knowledgePack, exerciseBlocks };
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
      "name specialty systemPrompt certifications profileImage trainingStyleTags",
    )
    .lean();
};

// ─────────────────────────────────────────────────────────────
// CREATE TRAINER PROFILE
// ─────────────────────────────────────────────────────────────

export const createTrainerService = async (
  userId: string,
  data: Partial<ITrainer>,
): Promise<ITrainer> => {
  const existing = await TrainerModel.findOne({ userId });
  if (existing) throw new Error("Trainer profile already exists for this user");

  const trainer = new TrainerModel({ userId, ...data });
  return await trainer.save();
};

// ─────────────────────────────────────────────────────────────
// UPDATE TRAINER PROFILE
// ─────────────────────────────────────────────────────────────

export const updateTrainerService = async (
  trainerId: string,
  updates: Partial<ITrainer>,
) => {
  // Protect fields that should never be updated here
  delete (updates as any).userId;
  delete (updates as any).subscriberCount;

  return await TrainerModel.findByIdAndUpdate(
    trainerId,
    { $set: updates },
    { new: true },
  );
};

// ─────────────────────────────────────────────────────────────
// DELETE TRAINER (cascade handled in service layer)
// ─────────────────────────────────────────────────────────────

export const deleteTrainerService = async (trainerId: string) => {
  // Note: in production also clean up blocks/exercises/steps/knowledgePack
  await TrainerModel.findByIdAndDelete(trainerId);
  return { message: "Trainer deleted" };
};
