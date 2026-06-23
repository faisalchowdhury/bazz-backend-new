import { Request, Response } from "express";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";
import {
  createContentService,
  getContentByTrainerService,
  getMyContent,
  getContentByCategoryService,
  getContentByIdService,
  updateContentService,
  publishContentService,
  deleteContentService,
} from "./content.service";
import { applyContentUploads, parseContentFormBody } from "./content.utils";

// POST /content/content  (multipart: video + optional thumbnail)
export const createContent = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const payload = applyContentUploads(parseContentFormBody(req.body), req);

    if (!payload.categoryId) {
      res
        .status(400)
        .json({ success: false, message: "categoryId is required" });
      return;
    }
    if (!payload.title || !payload.description) {
      res.status(400).json({
        success: false,
        message: "title and description are required",
      });
      return;
    }

    const contentType = payload.contentType || "video";
    if (contentType === "video" && !payload.videoUrl) {
      res.status(400).json({
        success: false,
        message: "video file is required for video content",
      });
      return;
    }

    const result = await createContentService(user.id, payload as any);
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

// GET /content/my-content?categoryId=&muscleGroup=&difficulty=&search=&page=&limit=&isPublished=
export const getMyContentController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const {
      categoryId,
      muscleGroup,
      difficulty,
      search,
      page,
      limit,
      isPublished,
    } = req.query;

    const result = await getMyContent(user.id, {
      categoryId: categoryId as string | undefined,
      muscleGroup: muscleGroup as string | undefined,
      difficulty: difficulty as string | undefined,
      search: search as string | undefined,
      isPublished:
        isPublished !== undefined ? isPublished === "true" : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });

    res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    const status = err.message.includes("Category not found") ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

// GET /content/category/:categoryId?isPublished=&page=&limit=
export const getContentByCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { isPublished, page, limit } = req.query;

    const result = await getContentByCategoryService(req.params.categoryId, {
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

// PUT /content/content/:id  (multipart: optional video + thumbnail)
export const updateContent = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const payload = applyContentUploads(parseContentFormBody(req.body), req);

    const result = await updateContentService(
      user.id,
      req.params.id,
      payload as any,
    );
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
