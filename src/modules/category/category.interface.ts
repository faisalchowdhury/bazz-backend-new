import { Document, Types } from "mongoose";

export interface ICategory extends Document {
  trainerId: Types.ObjectId; // ref → Trainer
  category: string; // e.g. "Upper Body", "Chest", "Boxing"
  slug: string; // e.g. "upper-body", "chest", "boxing"
  description?: string; // optional category description
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
