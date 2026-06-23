import { Request, Response } from "express";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";
import {
  createCategoryService,
  getCategoriesService,
  getCategoryByIdService,
  getCategoryBySlugService,
  updateCategoryService,
  deleteCategoryService,
  getMyCategories,
} from "./category.service";

// ─────────────────────────────────────────────────────────────
// POST /categories
// Trainer creates a new category
// ─────────────────────────────────────────────────────────────

export const createCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;

    const { category, slug, description } = req.body;
    if (!category || !slug) {
      res.status(400).json({
        success: false,
        message: "category and slug are required",
      });
      return;
    }

    const result = await createCategoryService(user.id, {
      category,
      slug,
      description,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /categories?trainerId=&isActive=
// Public — users browse categories for a trainer
// ─────────────────────────────────────────────────────────────

export const getCategories = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { trainerId, isActive } = req.query;

    if (!trainerId) {
      res.status(400).json({
        success: false,
        message: "trainerId is required",
      });
      return;
    }

    const result = await getCategoriesService(trainerId as string, {
      isActive: isActive !== undefined ? isActive === "true" : true,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /categories/my
// Trainer dashboard — get own categories using token (no trainerId needed)
// ─────────────────────────────────────────────────────────────

export const getMyCategoriesController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const result = await getMyCategories(user.id);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /categories/:id?trainerId=
// Public — get single category by MongoDB _id
// ─────────────────────────────────────────────────────────────

export const getCategoryById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { trainerId } = req.params;

    if (!trainerId) {
      res.status(400).json({
        success: false,
        message: "trainerId is required",
      });
      return;
    }

    const result = await getCategoryByIdService(
      req.params.id,
      trainerId as string,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /categories/slug/:slug?trainerId=
// Public — get category by slug (useful for frontend routing)
// ─────────────────────────────────────────────────────────────

export const getCategoryBySlug = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { trainerId } = req.query;

    if (!trainerId) {
      res.status(400).json({
        success: false,
        message: "trainerId is required",
      });
      return;
    }

    const result = await getCategoryBySlugService(
      req.params.slug,
      trainerId as string,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /categories/:id
// Trainer updates a category — FIXED version
// ─────────────────────────────────────────────────────────────

export const updateCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;

    const { category, slug, description, isActive } = req.body;

    const result = await updateCategoryService(user.id, req.params.id, {
      category,
      slug,
      description,
      isActive,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /categories/:id
// Trainer soft-deletes a category (sets isActive: false)
// ─────────────────────────────────────────────────────────────

export const deleteCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;
    await deleteCategoryService(user.id, req.params.id);
    res.status(200).json({ success: true, message: "Category deleted" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
