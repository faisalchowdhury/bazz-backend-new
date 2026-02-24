import multer, { FileFilterCallback } from "multer";
import path from "path";
import { Express } from "express";
import { Request } from "express";
import createHttpError from "http-errors";
import { max_file_size, UPLOAD_FOLDER } from "../config";

const UPLOAD_PATH = UPLOAD_FOLDER || "public/images"; // Default images folder
const MAX_FILE_SIZE = Number(max_file_size) || 5 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  ".jpg",
  ".jpeg",
  ".png",
  // ".xlsx",
  // ".xls",
  // ".csv",
  ".pdf",
  ".doc",
  ".docx",
  // ".mp3",
  // ".wav",
  // ".ogg",
  // ".mp4",
  // ".avi",
  // ".mov",
  // ".mkv",
  // ".webm",
  ".svg",
];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine the folder based on file type
    const extName = path.extname(file.originalname).toLowerCase();
    let folder = UPLOAD_PATH; // Default to images folder

    // Check if the file is an audio or video type
    if (
      [
        ".mp3",
        ".wav",
        ".ogg",
        ".mp4",
        ".avi",
        ".mov",
        ".mkv",
        ".webm",
      ].includes(extName)
    ) {
      folder = "public/media"; // Move audio/video files to the sound folder
    } else if (extName === ".pdf") {
      folder = "public/documents";
    }

    cb(null, folder);
  },
  filename: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) {
    const extName = path.extname(file.originalname);
    const fileName = file.originalname.replace(/\s+/g, "_");
    // const fileName = `${Date.now()}-${file.originalname.replace(extName, "")}${extName}`;
    cb(null, fileName);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const extName = path.extname(file.originalname).toLocaleLowerCase();
  const isAllowedFileType = ALLOWED_FILE_TYPES.includes(extName);

  if (!isAllowedFileType) {
    return cb(createHttpError(400, "File type not allowed"));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

export default upload;
