import { Request, Response } from "express";
import {
  createCategoryIntoDB,
  deleteCategoryFromDB,
  getAllCategoriesFromDB,
  getSingleCategoryFromDB,
  updateCategoryIntoDB,
} from "./category.service";

// Create Category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const result = await createCategoryIntoDB(req.body);

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Categories
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const result = await getAllCategoriesFromDB();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Single Category
export const getSingleCategory = async (req: Request, res: Response) => {
  try {
    const result = await getSingleCategoryFromDB(req.params.id);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Category
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const result = await updateCategoryIntoDB(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete Category
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const result = await deleteCategoryFromDB(req.params.id);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
