import { Router } from "express";
import upload from "../../multer/multer";
import { guardRole } from "../../middlewares/roleGuard";
import {
  createContent,
  getContent,
  getMyContentController,
  getContentByCategory,
  getContentById,
  updateContent,
  publishContent,
  deleteContent,
} from "./content.controller";

const router = Router();

const contentUpload = upload.fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

// Public — users can browse + watch published content
router.get("/", getContent);
router.get("/my-content", guardRole(["trainer"]), getMyContentController);
router.get("/category/:categoryId", getContentByCategory);
router.get("/content/:id", getContentById);

// Trainer only — multipart/form-data with video file upload
router.post("/content", guardRole(["trainer"]), contentUpload, createContent);
router.put("/content/:id", guardRole(["trainer"]), contentUpload, updateContent);
router.patch("/content/:id/publish", guardRole(["trainer"]), publishContent);
router.delete("/content/:id", guardRole(["trainer"]), deleteContent);

export const ContentRoutes = router;