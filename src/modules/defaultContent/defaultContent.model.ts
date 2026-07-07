import mongoose, { Schema } from "mongoose";
import { IDefaultContent } from "./defaultContent.interface";

const defaultContentSchema = new Schema<IDefaultContent>(
  {
    title: { type: String, required: true, index: true },
    videoPath: { type: String, required: true, unique: true },
  },
  { timestamps: true, collection: "defaultContent" },
);

defaultContentSchema.index({ title: "text" });

export const DefaultContentModel =
  (mongoose.models.DefaultContent as mongoose.Model<IDefaultContent>) ||
  mongoose.model<IDefaultContent>("DefaultContent", defaultContentSchema);
