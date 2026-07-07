import { Document } from "mongoose";

export interface IDefaultContent extends Document {
  title: string;
  videoPath: string;
  createdAt: Date;
  updatedAt: Date;
}
