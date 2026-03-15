import mongoose, { Schema } from "mongoose";
import { IContent } from "./content.interface";

const contentSchema = new Schema<IContent>({
  trainerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  video: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  intensity: {
    type: String,
    required: true,
    enum: ["easy", "medium", "hard"],
  },
  description: {
    type: String,
    required: true,
  },
});

export const ContentModel = mongoose.model<IContent>("Content", contentSchema);
