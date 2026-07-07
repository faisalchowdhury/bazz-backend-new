import fs from "fs";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { DEFAULT_CONTENT_DIR } from "../modules/defaultContent/defaultContent.utils";

const MAX_SIZE =
  Number(process.env.CONTENT_VIDEO_MAX_SIZE) || 200 * 1024 * 1024;

const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/m4v",
  "video/webm",
  "application/octet-stream",
]);

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    fs.mkdirSync(DEFAULT_CONTENT_DIR, { recursive: true });
    cb(null, DEFAULT_CONTENT_DIR);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".mp4";
    const base = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^\w.-]+/g, "_")
      .slice(0, 100);
    cb(null, `${Date.now()}-${base || "video"}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (file.fieldname !== "video") {
    return cb(createHttpError(400, `Unexpected field: ${file.fieldname}`));
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExt = [".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv", ".3gp"];

  if (
    allowedExt.includes(ext) ||
    file.mimetype.startsWith("video/") ||
    VIDEO_MIMES.has(file.mimetype)
  ) {
    return cb(null, true);
  }

  return cb(createHttpError(400, `Video type not allowed: ${file.mimetype}`));
};

export const defaultContentUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE, files: 1 },
}).fields([{ name: "video", maxCount: 1 }]);

export const handleDefaultContentUpload = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  defaultContentUpload(req, res, (err: unknown) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: err.message,
        code: err.code,
      });
    }

    const message = err instanceof Error ? err.message : "Upload failed";
    return res.status(400).json({ success: false, message });
  });
};
