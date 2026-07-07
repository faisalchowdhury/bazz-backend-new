import { Router } from "express";
import { handleContentUpload } from "../../multer/contentUpload";
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

// Public — users can browse + watch published content
router.get("/", getContent);
router.get("/my-content", guardRole(["trainer"]), getMyContentController);
router.get("/category/:categoryId", getContentByCategory);
router.get("/content/:id", getContentById);

// Trainer only — multipart/form-data with video file upload (iOS-safe)
router.post("/content", guardRole(["trainer"]), handleContentUpload, createContent);
router.put("/content/:id", guardRole(["trainer"]), handleContentUpload, updateContent);
router.patch("/content/:id/publish", guardRole(["trainer"]), publishContent);
router.delete("/content/:id", guardRole(["trainer"]), deleteContent);

export const ContentRoutes = router;