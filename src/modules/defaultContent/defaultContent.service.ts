import fs from "fs";
import path from "path";
import { IDefaultContent } from "./defaultContent.interface";
import { DefaultContentModel } from "./defaultContent.model";
import {
  DEFAULT_CONTENT_DIR,
  DEFAULT_CONTENT_URL_PREFIX,
  filenameToTitle,
  VIDEO_EXTENSIONS,
  videoPathToFilename,
} from "./defaultContent.utils";

type ListFilters = {
  search?: string;
  limit?: number;
  page?: number;
};

export const listDefaultContentService = async (filters: ListFilters = {}) => {
  const query: Record<string, unknown> = {};

  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  const limit = filters.limit || 20;
  const page = filters.page || 1;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    DefaultContentModel.find(query)
      .sort({ title: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    DefaultContentModel.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getDefaultContentByIdService = async (id: string) => {
  const item = await DefaultContentModel.findById(id).lean();
  if (!item) throw new Error("Default content not found");
  return item;
};

export const createDefaultContentService = async (data: {
  title: string;
  videoPath: string;
}) => {
  const content = new DefaultContentModel(data);
  return content.save();
};

export const updateDefaultContentService = async (
  id: string,
  data: Partial<Pick<IDefaultContent, "title" | "videoPath">>,
  options?: { replaceVideoFile?: boolean },
) => {
  const existing = await DefaultContentModel.findById(id);
  if (!existing) throw new Error("Default content not found");

  if (
    options?.replaceVideoFile &&
    data.videoPath &&
    data.videoPath !== existing.videoPath
  ) {
    const oldFilename = videoPathToFilename(existing.videoPath);
    const oldFilePath = path.join(DEFAULT_CONTENT_DIR, oldFilename);
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }
  }

  Object.assign(existing, data);
  return existing.save();
};

export const deleteDefaultContentService = async (
  id: string,
  deleteFile = false,
) => {
  const item = await DefaultContentModel.findById(id);
  if (!item) throw new Error("Default content not found");

  if (deleteFile) {
    const filename = videoPathToFilename(item.videoPath);
    const filePath = path.join(DEFAULT_CONTENT_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await item.deleteOne();
  return { deleted: true, id };
};

export type SeedDefaultContentResult = {
  scanned: number;
  created: number;
  updated: number;
  errors: { filename: string; message: string }[];
};

export const seedDefaultContentFromDisk = async (): Promise<SeedDefaultContentResult> => {
  const result: SeedDefaultContentResult = {
    scanned: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  if (!fs.existsSync(DEFAULT_CONTENT_DIR)) {
    throw new Error(`Directory not found: ${DEFAULT_CONTENT_DIR}`);
  }

  // Migrate legacy records that used videoUrl instead of videoPath
  const legacy = await DefaultContentModel.find({
    videoPath: { $exists: false },
    videoUrl: { $exists: true },
  });
  for (const doc of legacy) {
    const legacyPath = doc.get("videoUrl") as string;
    if (legacyPath) {
      doc.videoPath = legacyPath;
      await doc.save();
    }
  }

  const files = fs
    .readdirSync(DEFAULT_CONTENT_DIR)
    .filter((file) => VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase()));

  result.scanned = files.length;

  for (const filename of files) {
    try {
      const title = filenameToTitle(filename);
      const videoPath = `${DEFAULT_CONTENT_URL_PREFIX}/${filename}`;

      const existing = await DefaultContentModel.findOne({
        $or: [{ videoPath }, { videoUrl: videoPath }],
      });
      if (existing) {
        existing.title = title;
        existing.videoPath = videoPath;
        await existing.save();
        result.updated += 1;
        continue;
      }

      await DefaultContentModel.create({ title, videoPath });
      result.created += 1;
    } catch (err) {
      result.errors.push({
        filename,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
};
