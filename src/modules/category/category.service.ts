import { TrainerModel } from "../trainer/trainer.model";
import { CategoryModel } from "./category.model";
import { ICategory } from "./category.interface";

// ─────────────────────────────────────────────────────────────
// HELPER — get trainerId from userId
// ─────────────────────────────────────────────────────────────

const getTrainerByUserId = async (userId: string) => {
  const trainer = await TrainerModel.findOne({ userId });
  if (!trainer) throw new Error("Trainer not found");
  return trainer;
};

// ─────────────────────────────────────────────────────────────
// CREATE CATEGORY
// ─────────────────────────────────────────────────────────────

export const createCategoryService = async (
  userId: string,
  data: Pick<ICategory, "category" | "slug"> & { description?: string },
) => {
  const trainer = await getTrainerByUserId(userId);

  // Check for duplicate slug under same trainer
  const existing = await CategoryModel.findOne({
    trainerId: trainer._id,
    slug: data.slug,
  });
  if (existing)
    throw new Error(`Category with slug "${data.slug}" already exists`);

  return await CategoryModel.create({
    trainerId: trainer._id,
    ...data,
  });
};

// ─────────────────────────────────────────────────────────────
// GET ALL CATEGORIES FOR A TRAINER
// ─────────────────────────────────────────────────────────────

export const getCategoriesService = async (
  trainerId: string,
  filters: { isActive?: boolean } = {},
) => {
  const query: any = { trainerId };

  // Default to only active categories
  query.isActive = filters.isActive !== undefined ? filters.isActive : true;

  return await CategoryModel.find(query).sort({ category: 1 }).lean();
};

// ─────────────────────────────────────────────────────────────
// GET SINGLE CATEGORY BY ID
// ─────────────────────────────────────────────────────────────

export const getCategoryByIdService = async (id: string, trainerId: string) => {
  const category = await CategoryModel.findOne({ _id: id, trainerId }).lean();
  if (!category) throw new Error("Category not found");
  return category;
};

// ─────────────────────────────────────────────────────────────
// GET CATEGORY BY SLUG
// ─────────────────────────────────────────────────────────────

export const getCategoryBySlugService = async (
  slug: string,
  trainerId: string,
) => {
  const category = await CategoryModel.findOne({
    slug,
    trainerId,
    isActive: true,
  }).lean();
  if (!category) throw new Error("Category not found");
  return category;
};

// ─────────────────────────────────────────────────────────────
// UPDATE CATEGORY — BUG FIXED VERSION
// Bug 1: was using find() → returns array, trainer._id = undefined
// Bug 2: was using updateOne() → returns { modifiedCount } not document
// Bug 3: was missing $set → would wipe other fields
// ─────────────────────────────────────────────────────────────

export const updateCategoryService = async (
  userId: string,
  id: string,
  data: Partial<
    Pick<ICategory, "category" | "slug" | "description" | "isActive">
  >,
) => {
  // findOne (not find) — returns single document, not array
  const trainer = await TrainerModel.findOne({ userId });
  if (!trainer) throw new Error("Trainer not found");

  // If slug is being updated, check it won't conflict
  if (data.slug) {
    const slugExists = await CategoryModel.findOne({
      trainerId: trainer._id,
      slug: data.slug,
      _id: { $ne: id }, // exclude current doc
    });
    if (slugExists) throw new Error(`Slug "${data.slug}" is already taken`);
  }

  // findOneAndUpdate with $set + { new: true } → returns updated document
  const result = await CategoryModel.findOneAndUpdate(
    { _id: id, trainerId: trainer._id },
    { $set: data }, // $set prevents wiping other fields
    { new: true }, // returns updated doc not original
  );

  if (!result)
    throw new Error("Category not found or does not belong to this trainer");
  return result;
};

// ─────────────────────────────────────────────────────────────
// DELETE CATEGORY (soft delete)
// ─────────────────────────────────────────────────────────────

export const deleteCategoryService = async (userId: string, id: string) => {
  const trainer = await TrainerModel.findOne({ userId });
  if (!trainer) throw new Error("Trainer not found");

  const result = await CategoryModel.findOneAndUpdate(
    { _id: id, trainerId: trainer._id },
    { $set: { isActive: false } },
    { new: true },
  );

  if (!result)
    throw new Error("Category not found or does not belong to this trainer");
  return result;
};

// ─────────────────────────────────────────────────────────────
// GET TRAINER'S OWN CATEGORIES (uses userId not trainerId)
// Used in trainer dashboard — no need to pass trainerId separately
// ─────────────────────────────────────────────────────────────

export const getMyCategories = async (userId: string) => {
  const trainer = await TrainerModel.findOne({ userId });
  if (!trainer) throw new Error("Trainer not found");

  return await CategoryModel.find({ trainerId: trainer._id })
    .sort({ category: 1 })
    .lean();
};
