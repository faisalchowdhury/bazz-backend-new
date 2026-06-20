import { TrainerModel } from "./trainer.model";
import { ITrainer } from "./trainer.interface";
import { getBlocksByTrainer } from "../exerciseBlock/exerciseBlock.service";
import { getKnowledgePackService } from "../trainerKnowledge/trainerKnowledge.service";
import paginationBuilder from "../../utils/paginationBuilder";

// ─────────────────────────────────────────────────────────────
// BUILD SYSTEM PROMPT (generated — never taken from request body)
// Derived from the trainer's own profile fields so the AI persona
// always stays in sync with the info the trainer filled in.
// ─────────────────────────────────────────────────────────────

const buildSystemPrompt = (data: Partial<ITrainer>): string => {
  const name = data.name?.trim() || "the trainer";

  const certs = (data.certifications || []).filter(Boolean);
  const certLine = certs.length ? `${certs.join(", ")}. ` : "";

  const specialtyHuman = (data.specialty || "").replace(/_/g, " ").toUpperCase();
  const specialtyLine = specialtyHuman
    ? `Your specialty is ${specialtyHuman}. `
    : "";

  const tags = (data.trainingStyleTags || []).filter(Boolean);
  const styleLine = tags.length
    ? `Your coaching style emphasizes: ${tags.join(", ")}. `
    : "";

  const bioLine = data.bio?.trim() ? `${data.bio.trim()} ` : "";

  return (
    `You are ${name}: ${certLine}` +
    specialtyLine +
    bioLine +
    styleLine +
    `Help users with safe, practical, and structured guidance aligned to your specialty. ` +
    `Never recommend unsafe, extreme, or harmful protocols. Output ONLY valid JSON.`
  );
};

// ─────────────────────────────────────────────────────────────
// GET ALL TRAINERS (browse / discovery)
// ─────────────────────────────────────────────────────────────

export const getAllTrainers = async (
  filters: {
    specialty?: string;
    isVerified?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
) => {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
  const skip = (page - 1) * limit;

  const query: any = { isActive: true };
  if (filters.specialty) query.specialty = filters.specialty;
  if (filters.isVerified !== undefined) query.isVerified = filters.isVerified;
  if (filters.search?.trim()) {
    query.name = { $regex: filters.search.trim(), $options: "i" };
  }

  const [trainers, totalData] = await Promise.all([
    TrainerModel.find(query)
      .select(
        "name specialty certifications trainingStyleTags profileImage subscriptionPrice subscriberCount bio",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    TrainerModel.countDocuments(query),
  ]);

  const pagination = paginationBuilder({ totalData, currentPage: page, limit });

  return { trainers, pagination };
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

  // systemPrompt is generated from the profile, never accepted from the body.
  const { systemPrompt: _ignored, ...rest } = data;

  const trainer = new TrainerModel({
    userId,
    ...rest,
    systemPrompt: buildSystemPrompt(rest),
  });
  return await trainer.save();
};

// ─────────────────────────────────────────────────────────────
// UPDATE TRAINER PROFILE
// ─────────────────────────────────────────────────────────────

export const updateTrainerService = async (
  trainerId: string,
  updates: Partial<ITrainer>,
) => {
  // Protect fields that should never be set directly here
  delete (updates as any).userId;
  delete (updates as any).subscriberCount;
  delete (updates as any).systemPrompt; // generated, not client-supplied

  const existing = await TrainerModel.findById(trainerId);
  if (!existing) throw new Error("Trainer not found");

  // Regenerate systemPrompt if any of the fields it's derived from changed.
  const SOURCE_FIELDS: (keyof ITrainer)[] = [
    "name",
    "bio",
    "certifications",
    "specialty",
    "trainingStyleTags",
  ];
  const finalUpdates: Partial<ITrainer> = { ...updates };
  if (SOURCE_FIELDS.some((f) => f in updates)) {
    finalUpdates.systemPrompt = buildSystemPrompt({
      name: updates.name ?? existing.name,
      bio: updates.bio ?? existing.bio,
      certifications: updates.certifications ?? existing.certifications,
      specialty: updates.specialty ?? existing.specialty,
      trainingStyleTags: updates.trainingStyleTags ?? existing.trainingStyleTags,
    });
  }

  return await TrainerModel.findByIdAndUpdate(
    trainerId,
    { $set: finalUpdates },
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
