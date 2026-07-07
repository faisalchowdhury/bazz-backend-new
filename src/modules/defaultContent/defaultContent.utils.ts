import path from "path";
import { Request } from "express";

export const DEFAULT_CONTENT_DIR = "public/media/default_content";
export const DEFAULT_CONTENT_URL_PREFIX = "/media/default_content";

export const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".m4v",
  ".webm",
  ".avi",
  ".mkv",
  ".3gp",
]);

/** "Barbell_Pause_Incline_female.mp4" → "Barbell Pause Incline" */
export const filenameToTitle = (filename: string): string => {
  const base = path.basename(filename, path.extname(filename));
  return base
    .replace(/_female$/i, "")
    .replace(/_male$/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const videoPathToFilename = (videoPath: string): string =>
  path.basename(videoPath);

export const buildVideoPath = (storedFilename: string): string =>
  `${DEFAULT_CONTENT_URL_PREFIX}/${storedFilename}`;

type UploadFiles = { video?: Express.Multer.File[] };

export const getUploadedVideoFile = (
  req: Request,
): Express.Multer.File | undefined =>
  (req.files as UploadFiles | undefined)?.video?.[0];

export const parseDefaultContentBody = (body: Record<string, unknown>) => ({
  title: typeof body.title === "string" ? body.title.trim() : undefined,
});

export const hasTextVideoPath = (body: Record<string, unknown>): boolean =>
  typeof body.videoPath === "string" && body.videoPath.trim().length > 0;
