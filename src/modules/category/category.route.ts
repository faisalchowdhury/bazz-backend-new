import { Router } from "express";
import { protect } from "../../middlewares/auth";
import { guardRole } from "../../middlewares/roleGuard";
import {
  createCategory,
  getCategories,
  getMyCategoriesController,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
} from "./category.controller";

const router = Router();

// ── Public routes (no auth needed) ───────────────────────────

// GET /categories?trainerId=&isActive=
// Browse all categories for a trainer (used by user/public)
router.get("/", getCategories);

// GET /categories/slug/:slug?trainerId=
// Get by slug — must be before /:id to avoid conflict
router.get("/slug/:slug", getCategoryBySlug);

// GET /categories/:id?trainerId=
// Get single category by MongoDB _id
router.get("/:id", getCategoryById);

// ── Protected trainer routes ──────────────────────────────────

// GET /categories/my
// Trainer dashboard — get own categories (no trainerId needed in query)
router.get("/my", guardRole(["trainer"]), getMyCategoriesController);

// POST /categories
// Create a new category
router.post("/create", guardRole(["trainer"]), createCategory);

// PUT /categories/:id
// Update a category — full fix applied in service
router.put("/:id", guardRole(["trainer"]), updateCategory);

// DELETE /categories/:id
// Soft delete
router.delete("/:id", guardRole(["trainer"]), deleteCategory);

export const CategoryRoutes = router;
