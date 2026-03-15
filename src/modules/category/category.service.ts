import { CategoryModel } from "./category.model";
import { ICategory } from "./category.interface";
import ApiError from "../../errors/ApiError";

export const createCategoryIntoDB = async (payload: ICategory) => {
  const { category, slug } = payload;

  if (!category || !slug) {
    throw new ApiError(400, "Category and slug are required ");
  }

  const isExist = await CategoryModel.findOne({ slug });

  if (isExist) {
    throw new ApiError(400, "Category exist");
  }

  const result = await CategoryModel.create(payload);
  return result;
};

export const getAllCategoriesFromDB = async () => {
  const result = await CategoryModel.find();
  return result;
};

export const getSingleCategoryFromDB = async (id: string) => {
  const result = await CategoryModel.findById(id);
  return result;
};

export const updateCategoryIntoDB = async (
  id: string,
  payload: Partial<ICategory>,
) => {
  const result = await CategoryModel.findByIdAndUpdate(id, payload, {
    new: true,
  });
  return result;
};

export const deleteCategoryFromDB = async (id: string) => {
  const result = await CategoryModel.findByIdAndDelete(id);
  return result;
};
