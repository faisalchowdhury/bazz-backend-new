import fs from "fs";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import { Express, Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";

/** iOS/Android videos can exceed default 50MB image limit */
const CONTENT_VIDEO_MAX_SIZE =
  Number(process.env.CONTENT_VIDEO_MAX_SIZE) || 200 * 1024 * 1024; // 200MB
const CONTENT_THUMBNAIL_MAX_SIZE =
  Number(process.env.CONTENT_THUMBNAIL_MAX_SIZE) || 10 * 1024 * 1024; // 10MB

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".m4v",
  ".webm",
  ".avi",
  ".mkv",
  ".3gp",
  ".qt",
]);

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".heic",
  ".heif",
]);

const MIME_TO_EXT: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/x-m4v": ".m4v",
  "video/m4v": ".m4v",
  "video/webm": ".webm",
  "video/x-msvideo": ".avi",
  "video/x-matroska": ".mkv",
  "video/3gpp": ".3gp",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

const resolveExtension = (file: Express.Multer.File): string => {
  const fromName = path.extname(file.originalname).toLowerCase();
  if (fromName) return fromName;
  if (MIME_TO_EXT[file.mimetype]) return MIME_TO_EXT[file.mimetype];
  if (file.fieldname === "video") return ".mp4";
  if (file.fieldname === "thumbnail") return ".jpg";
  return "";
};

const isAllowedVideo = (file: Express.Multer.File): boolean => {
  const ext = resolveExtension(file);
  if (ext && VIDEO_EXTENSIONS.has(ext)) return true;
  if (file.mimetype.startsWith("video/")) return true;
  // iOS gallery/camera often sends this when extension is missing
  if (
    file.fieldname === "video" &&
    (file.mimetype === "application/octet-stream" ||
      file.mimetype === "binary/octet-stream")
  ) {
    return true;
  }
  return false;
};

const isAllowedThumbnail = (file: Express.Multer.File): boolean => {
  const ext = resolveExtension(file);
  if (ext && IMAGE_EXTENSIONS.has(ext)) return true;
  if (file.mimetype.startsWith("image/")) return true;
  return false;
};

const storage = multer.diskStorage({
  destination(_req, file, cb) {
    const folder =
      file.fieldname === "video"
        ? "public/media"
        : file.fieldname === "thumbnail"
          ? "public/images"
          : "public/images";

    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename(_req, file, cb) {
    const ext = resolveExtension(file);
    const baseName = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^\w.-]+/g, "_")
      .slice(0, 80);

    const safeBase = baseName || file.fieldname;
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (file.fieldname === "video") {
    if (isAllowedVideo(file)) return cb(null, true);
    return cb(
      createHttpError(
        400,
        `Video type not allowed (${file.mimetype}, ${file.originalname}). Use mp4, mov, or m4v.`,
      ),
    );
  }

  if (file.fieldname === "thumbnail") {
    if (isAllowedThumbnail(file)) return cb(null, true);
    return cb(
      createHttpError(
        400,
        `Thumbnail type not allowed (${file.mimetype}, ${file.originalname}).`,
      ),
    );
  }

  return cb(createHttpError(400, `Unexpected upload field: ${file.fieldname}`));
};

export const contentUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: CONTENT_VIDEO_MAX_SIZE,
    files: 2,
  },
}).fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

/** Wrap multer to return JSON errors (iOS clients need clear messages) */
export const handleContentUpload = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  contentUpload(req, res, (err: unknown) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: `File too large. Max video size is ${Math.round(CONTENT_VIDEO_MAX_SIZE / (1024 * 1024))}MB.`,
          code: "LIMIT_FILE_SIZE",
        });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          success: false,
          message:
            'Unexpected field name. Use multipart fields "video" and optional "thumbnail".',
          code: "LIMIT_UNEXPECTED_FILE",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message,
        code: err.code,
      });
    }

    const message =
      err instanceof Error ? err.message : "File upload failed";
    return res.status(400).json({ success: false, message });
  });
};

export { CONTENT_VIDEO_MAX_SIZE, CONTENT_THUMBNAIL_MAX_SIZE };
