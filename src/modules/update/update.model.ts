import mongoose, { Schema } from "mongoose";
import { IUpdate } from "./update.interface";

const updateSchema = new Schema<IUpdate>(
  {
    trainerUserId: {
      type: Schema.Types.ObjectId,

      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,

      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export const UpdateModel =
  (mongoose.models.Update as mongoose.Model<IUpdate>) ||
  mongoose.model<IUpdate>("Update", updateSchema);
