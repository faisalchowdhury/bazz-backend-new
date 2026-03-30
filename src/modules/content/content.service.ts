import { ICategory } from "../category/category.interface";
import { CategoryModel } from "../category/category.model";
import { TrainerModel } from "../trainer/trainer.model";

import { IContent } from "./content.interface";
import { ContentModel } from "./content.model";

// ─────────────────────────────────────────────────────────────
// CATEGORY SERVICES
// ─────────────────────────────────────────────────────────────

// Helper — get trainerId from userId
const getTrainerIdFromUserId = async (userId: string) => {
  const trainer = await TrainerModel.findOne({ userId });
  if (!trainer) throw new Error("Trainer not found");
  return trainer._id;
};

export const createCategoryService = async (
  userId: string,
  data: Partial<ICategory>,
) => {
  const trainerId = await getTrainerIdFromUserId(userId);
  return await CategoryModel.create({ trainerId, ...data });
};

export const getCategoriesService = async (trainerId: string) => {
  return await CategoryModel.find({ trainerId, isActive: true })
    .sort({ category: 1 })
    .lean();
};

export const getCategoryByIdService = async (id: string, trainerId: string) => {
  const category = await CategoryModel.findOne({ _id: id, trainerId });
  if (!category) throw new Error("Category not found");
  return category;
};

export const updateCategoryService = async (
  userId: string,
  id: string,
  data: Partial<ICategory>,
) => {
  // Bug fixed: findOne not find, use _id in query
  const trainer = await TrainerModel.findOne({ userId });
  if (!trainer) throw new Error("Trainer not found");

  const result = await CategoryModel.findOneAndUpdate(
    { _id: id, trainerId: trainer._id },
    { $set: data },
    { new: true },
  );

  if (!result)
    throw new Error("Category not found or does not belong to this trainer");
  return result;
};

export const deleteCategoryService = async (userId: string, id: string) => {
  const trainer = await TrainerModel.findOne({ userId });
  if (!trainer) throw new Error("Trainer not found");

  // Soft delete — don't actually remove, just deactivate
  const result = await CategoryModel.findOneAndUpdate(
    { _id: id, trainerId: trainer._id },
    { $set: { isActive: false } },
    { new: true },
  );

  if (!result) throw new Error("Category not found");
  return result;
};

// ─────────────────────────────────────────────────────────────
// CONTENT SERVICES
// ─────────────────────────────────────────────────────────────

export const createContentService = async (
  userId: string,
  data: Partial<IContent> & { categoryId: string },
) => {
  const trainer = await TrainerModel.findOne({ userId });
  if (!trainer) throw new Error("Trainer not found");

  // Verify category belongs to this trainer
  const category = await CategoryModel.findOne({
    _id: data.categoryId,
    trainerId: trainer._id,
    isActive: true,
  });
  if (!category)
    throw new Error("Category not found or does not belong to this trainer");

  const content = new ContentModel({
    trainerId: trainer._id,
    ...data,
  });

  return await content.save(); // pre-save hook auto-builds searchText
};

export const getContentByTrainerService = async (
  trainerId: string,
  filters: {
    categoryId?: string;
    muscleGroup?: string;
    difficulty?: string;
    isPublished?: boolean;
    search?: string;
    limit?: number;
    page?: number;
  } = {},
) => {
  const query: any = { trainerId, isActive: true };

  if (filters.categoryId) query.categoryId = filters.categoryId;
  if (filters.muscleGroup) query.muscleGroups = filters.muscleGroup;
  if (filters.difficulty) query.difficulty = filters.difficulty;
  if (filters.isPublished !== undefined)
    query.isPublished = filters.isPublished;

  // Text search across title + description + tags
  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  const limit = filters.limit || 20;
  const page = filters.page || 1;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    ContentModel.find(query)
      .populate("categoryId", "category slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ContentModel.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getContentByIdService = async (id: string) => {
  const content = await ContentModel.findByIdAndUpdate(
    id,
    { $inc: { viewCount: 1 } }, // increment view count
    { new: true },
  ).populate("categoryId", "category slug");

  if (!content) throw new Error("Content not found");
  return content;
};

export const updateContentService = async (
  userId: string,
  id: string,
  data: Partial<IContent>,
) => {
  const trainer = await TrainerModel.findOne({ userId });
  if (!trainer) throw new Error("Trainer not found");

  // Use save() to trigger pre-save hook that rebuilds searchText
  const content = await ContentModel.findOne({
    _id: id,
    trainerId: trainer._id,
  });
  if (!content)
    throw new Error("Content not found or does not belong to this trainer");

  Object.assign(content, data);
  return await content.save();
};

export const publishContentService = async (userId: string, id: string) => {
  const trainer = await TrainerModel.findOne({ userId });
  if (!trainer) throw new Error("Trainer not found");

  const content = await ContentModel.findOneAndUpdate(
    { _id: id, trainerId: trainer._id },
    { $set: { isPublished: true } },
    { new: true },
  );
  if (!content) throw new Error("Content not found");
  return content;
};

export const deleteContentService = async (userId: string, id: string) => {
  const trainer = await TrainerModel.findOne({ userId });
  if (!trainer) throw new Error("Trainer not found");

  const content = await ContentModel.findOneAndUpdate(
    { _id: id, trainerId: trainer._id },
    { $set: { isActive: false } },
    { new: true },
  );
  if (!content) throw new Error("Content not found");
  return content;
};

// ─────────────────────────────────────────────────────────────
// AI CONTENT MATCHING
// Used by chat service to find videos relevant to user's question
// ─────────────────────────────────────────────────────────────

export const findRelevantContent = async (
  trainerId: string,
  query: {
    exerciseName?: string;
    muscleGroups?: string[];
    keywords?: string[];
    limit?: number;
  },
): Promise<IContent[]> => {
  const limit = query.limit || 3;

  // Build search terms from all query fields
  const searchTerms = [
    query.exerciseName || "",
    ...(query.muscleGroups || []),
    ...(query.keywords || []),
  ]
    .filter(Boolean)
    .join(" ");

  // Priority 1: Full-text search across searchText + title + description
  if (searchTerms.trim()) {
    const textResults = await ContentModel.find({
      trainerId,
      isPublished: true,
      isActive: true,
      $text: { $search: searchTerms },
    })
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .populate("categoryId", "category slug")
      .lean();

    if (textResults.length > 0) return textResults as IContent[];
  }

  // Priority 2: Fallback — match by exercise name or muscle groups
  const fallbackQuery: any = {
    trainerId,
    isPublished: true,
    isActive: true,
  };

  if (query.exerciseName) {
    fallbackQuery.$or = [
      { exerciseName: { $regex: query.exerciseName, $options: "i" } },
      { title: { $regex: query.exerciseName, $options: "i" } },
      { tags: { $in: [query.exerciseName.toLowerCase()] } },
    ];
  } else if (query.muscleGroups && query.muscleGroups.length > 0) {
    fallbackQuery.muscleGroups = { $in: query.muscleGroups };
  }

  return (await ContentModel.find(fallbackQuery)
    .sort({ viewCount: -1 })
    .limit(limit)
    .populate("categoryId", "category slug")
    .lean()) as IContent[];
};
