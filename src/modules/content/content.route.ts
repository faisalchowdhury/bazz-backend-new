import { Router } from "express";
import { protect } from "../../middlewares/auth";
import { guardRole } from "../../middlewares/roleGuard";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  createContent,
  getContent,
  getContentById,
  updateContent,
  publishContent,
  deleteContent,
} from "./content.controller";

const router = Router();

// ── Category Routes ───────────────────────────────────────────

// Public — users can browse categories
router.get("/categories", getCategories);
router.get("/categories/:id", getCategoryById);

// Trainer only
router.post(
  "/categories",

  guardRole(["trainer"]),
  createCategory,
);
router.put(
  "/categories/:id",

  guardRole(["trainer"]),
  updateCategory,
);
router.delete(
  "/categories/:id",

  guardRole(["trainer"]),
  deleteCategory,
);

// ── Content Routes ────────────────────────────────────────────

// Public — users can browse + watch published content
router.get("/content", getContent);
router.get("/content/:id", getContentById);

// Trainer only
router.post("/content", guardRole(["trainer"]), createContent);
router.put(
  "/content/:id",

  guardRole(["trainer"]),
  updateContent,
);
router.patch(
  "/content/:id/publish",

  guardRole(["trainer"]),
  publishContent,
);
router.delete(
  "/content/:id",

  guardRole(["trainer"]),
  deleteContent,
);

export const ContentRoutes = router;
