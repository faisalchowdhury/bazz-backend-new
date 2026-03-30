import mongoose, { Schema } from "mongoose";
import { ICategory } from "./category.interface";

const categorySchema = new Schema<ICategory>(
  {
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: "Trainer",
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

categorySchema.index({ trainerId: 1, slug: 1 }, { unique: true });

export const CategoryModel =
  (mongoose.models.Category as mongoose.Model<ICategory>) ||
  mongoose.model<ICategory>("Category", categorySchema);
