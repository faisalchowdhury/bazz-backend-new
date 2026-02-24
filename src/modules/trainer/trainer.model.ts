import mongoose from "mongoose";
import { ITrainer } from "./trainer.interface";

const trainerSchema = new mongoose.Schema<ITrainer>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fullName: {
    type: String,
  },
  userName: {
    type: String,
  },
  texDocument: {
    type: String,
  },
  specialties: {
    type: [String],
  },
  certificates: {
    type: [
      {
        name: {
          type: String,
          required: true,
        },
        institute: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          required: true,
        },
        certificateId: {
          type: String,
          required: true,
        },
      },
    ],
  },
  availability: {
    type: [String],
  },
  experience: {
    type: Number,
  },
});

export const TrainerModel = mongoose.model<ITrainer>("Trainer", trainerSchema);
