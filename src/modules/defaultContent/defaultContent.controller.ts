import { Request, Response } from "express";
import {
  createDefaultContentService,
  deleteDefaultContentService,
  getDefaultContentByIdService,
  listDefaultContentService,
  updateDefaultContentService,
} from "./defaultContent.service";
import {
  buildVideoPath,
  filenameToTitle,
  getUploadedVideoFile,
  hasTextVideoPath,
  parseDefaultContentBody,
} from "./defaultContent.utils";

const parseListQuery = (query: Request["query"]) => ({
  search: query.search as string | undefined,
  page: query.page ? Number(query.page) : undefined,
  limit: query.limit ? Number(query.limit) : undefined,
});

export const listDefaultContent = async (req: Request, res: Response) => {
  try {
    const result = await listDefaultContentService(parseListQuery(req.query));
    res.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list content";
    res.status(400).json({ success: false, message });
  }
};

export const getDefaultContentById = async (req: Request, res: Response) => {
  try {
    const data = await getDefaultContentByIdService(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    res.status(404).json({ success: false, message });
  }
};

export const createDefaultContent = async (req: Request, res: Response) => {
  try {
    if (hasTextVideoPath(req.body)) {
      res.status(400).json({
        success: false,
        message:
          "Upload a video file using the video field. videoPath cannot be sent as text.",
      });
      return;
    }

    const videoFile = getUploadedVideoFile(req);
    if (!videoFile) {
      res.status(400).json({
        success: false,
        message: "video file is required (multipart field: video)",
      });
      return;
    }

    const { title } = parseDefaultContentBody(req.body);
    const finalTitle = title || filenameToTitle(videoFile.originalname);
    if (!finalTitle) {
      res.status(400).json({ success: false, message: "title is required" });
      return;
    }

    const data = await createDefaultContentService({
      title: finalTitle,
      videoPath: buildVideoPath(videoFile.filename),
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create content";
    res.status(400).json({ success: false, message });
  }
};

export const updateDefaultContent = async (req: Request, res: Response) => {
  try {
    if (hasTextVideoPath(req.body)) {
      res.status(400).json({
        success: false,
        message:
          "Upload a video file using the video field. videoPath cannot be sent as text.",
      });
      return;
    }

    const videoFile = getUploadedVideoFile(req);
    const { title } = parseDefaultContentBody(req.body);
    const update: { title?: string; videoPath?: string } = {};

    if (title) update.title = title;
    if (videoFile) {
      update.videoPath = buildVideoPath(videoFile.filename);
    }

    if (!update.title && !update.videoPath) {
      res.status(400).json({
        success: false,
        message: "Send title and/or upload a new video file (field: video)",
      });
      return;
    }

    const data = await updateDefaultContentService(req.params.id, update, {
      replaceVideoFile: Boolean(videoFile),
    });
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update content";
    res.status(400).json({ success: false, message });
  }
};

export const deleteDefaultContent = async (req: Request, res: Response) => {
  try {
    const deleteFile = req.query.deleteFile === "true";
    const data = await deleteDefaultContentService(req.params.id, deleteFile);
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete content";
    res.status(400).json({ success: false, message });
  }
};

export const DefaultContentController = {
  listDefaultContent,
  getDefaultContentById,
  createDefaultContent,
  updateDefaultContent,
  deleteDefaultContent,
};
