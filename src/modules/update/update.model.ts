import mongoose, { Schema } from "mongoose";
import { IUpdate } from "./update.interface";

const updateSchema = new Schema<IUpdate>({
  trainerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  upload: {
    type: String,
  },
});

export const UpdateModel = mongoose.model<IUpdate>("Update", updateSchema);
