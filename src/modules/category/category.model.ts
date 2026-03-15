import mongoose, { Schema } from "mongoose";
import { ICategory } from "./category.interface";

const categorySchema = new Schema<ICategory>({
  category: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
  },
});

export const CategoryModel = mongoose.model("Category", categorySchema);
