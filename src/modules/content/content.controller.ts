import { Request, Response } from "express";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";
import {
  createCategoryService,
  getCategoriesService,
  getCategoryByIdService,
  updateCategoryService,
  deleteCategoryService,
  createContentService,
  getContentByTrainerService,
  getContentByIdService,
  updateContentService,
  publishContentService,
  deleteContentService,
} from "./content.service";

// ─────────────────────────────────────────────────────────────
// CATEGORY CONTROLLERS
// ─────────────────────────────────────────────────────────────

// POST /categories
export const createCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const result = await createCategoryService(user.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /categories?trainerId=...
export const getCategories = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { trainerId } = req.query;
    if (!trainerId) {
      res
        .status(400)
        .json({ success: false, message: "trainerId is required" });
      return;
    }
    const result = await getCategoriesService(trainerId as string);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /categories/:id
export const getCategoryById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { trainerId } = req.query;
    if (!trainerId) {
      res
        .status(400)
        .json({ success: false, message: "trainerId is required" });
      return;
    }
    const result = await getCategoryByIdService(
      req.params.id,
      trainerId as string,
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// PUT /categories/:id  ← FIXED VERSION
export const updateCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const result = await updateCategoryService(
      user.id,
      req.params.id,
      req.body,
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /categories/:id
export const deleteCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;
    await deleteCategoryService(user.id, req.params.id);
    res.json({ success: true, message: "Category deleted" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// CONTENT CONTROLLERS
// ─────────────────────────────────────────────────────────────

// POST /content
export const createContent = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;

    if (!req.body.categoryId) {
      res
        .status(400)
        .json({ success: false, message: "categoryId is required" });
      return;
    }
    if (!req.body.title || !req.body.description) {
      res.status(400).json({
        success: false,
        message: "title and description are required",
      });
      return;
    }

    const result = await createContentService(user.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /content?trainerId=&categoryId=&muscleGroup=&difficulty=&search=&page=&limit=
export const getContent = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      trainerId,
      categoryId,
      muscleGroup,
      difficulty,
      search,
      page,
      limit,
      isPublished,
    } = req.query;

    if (!trainerId) {
      res
        .status(400)
        .json({ success: false, message: "trainerId is required" });
      return;
    }

    const result = await getContentByTrainerService(trainerId as string, {
      categoryId: categoryId as string | undefined,
      muscleGroup: muscleGroup as string | undefined,
      difficulty: difficulty as string | undefined,
      search: search as string | undefined,
      isPublished:
        isPublished !== undefined ? isPublished === "true" : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /content/:id
export const getContentById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await getContentByIdService(req.params.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// PUT /content/:id
export const updateContent = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const result = await updateContentService(user.id, req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /content/:id/publish
export const publishContent = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const result = await publishContentService(user.id, req.params.id);
    res.json({ success: true, message: "Content published", data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /content/:id
export const deleteContent = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;
    await deleteContentService(user.id, req.params.id);
    res.json({ success: true, message: "Content deleted" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
