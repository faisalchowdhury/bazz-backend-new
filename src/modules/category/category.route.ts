import express from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
} from "./category.controller";
import { guardRole } from "../../middlewares/roleGuard";

const router = express.Router();

router.post("/create", guardRole(["admin"]), createCategory);

router.get("/all-category", guardRole(["admin"]), getAllCategories);

router.get("/:id", guardRole(["admin"]), getSingleCategory);

router.patch("/update-category/:id", guardRole(["admin"]), updateCategory);

router.delete("/delete-category/:id", guardRole(["admin"]), deleteCategory);

export const CategoryRoutes = router;
