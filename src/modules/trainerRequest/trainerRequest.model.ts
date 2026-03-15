import mongoose, { Schema } from "mongoose";
import { ITrainerRequest } from "./trainerRequest.interface";

const trainerRequest = new Schema<ITrainerRequest>({
  trainerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  userUserId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  shortMessage: {
    type: String,
  },
  status: {
    type: String,
    required: true,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
});

export const TrainerRequestModel = mongoose.model<ITrainerRequest>(
  "TrainerRequest",
  trainerRequest,
);
