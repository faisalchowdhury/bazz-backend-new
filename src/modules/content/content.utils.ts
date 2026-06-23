import { Request } from "express";

type ContentFiles = {
  video?: Express.Multer.File[];
  thumbnail?: Express.Multer.File[];
};

const parseJsonArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value.map(String);

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return undefined;
};

const parseNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

export const parseContentFormBody = (body: Record<string, unknown>) => {
  const muscleGroups = parseJsonArray(body.muscleGroups);
  const tags = parseJsonArray(body.tags);
  const equipment = parseJsonArray(body.equipment);
  const durationSeconds = parseNumber(body.durationSeconds);
  const isPublished = parseBoolean(body.isPublished);

  return {
    categoryId: body.categoryId as string | undefined,
    title: body.title as string | undefined,
    description: body.description as string | undefined,
    contentType: body.contentType as string | undefined,
    videoUrl: body.videoUrl as string | undefined,
    thumbnailUrl: body.thumbnailUrl as string | undefined,
    exerciseName: body.exerciseName as string | undefined,
    difficulty: body.difficulty as string | undefined,
    ...(muscleGroups !== undefined && { muscleGroups }),
    ...(tags !== undefined && { tags }),
    ...(equipment !== undefined && { equipment }),
    ...(durationSeconds !== undefined && { durationSeconds }),
    ...(isPublished !== undefined && { isPublished }),
  };
};

export const applyContentUploads = (
  data: ReturnType<typeof parseContentFormBody>,
  req: Request,
) => {
  const files = req.files as ContentFiles | undefined;

  const videoFile = files?.video?.[0];
  const thumbnailFile = files?.thumbnail?.[0];

  if (videoFile) {
    data.videoUrl = `/media/${videoFile.filename}`;
  }

  if (thumbnailFile) {
    data.thumbnailUrl = `/images/${thumbnailFile.filename}`;
  }

  return data;
};
