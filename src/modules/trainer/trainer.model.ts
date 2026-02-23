import mongoose from "mongoose";
import { ITrainer } from "./trainer.interface";

const trainerSchema = new mongoose.Schema<ITrainer>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  texDocument: {
    type: String,
    required: true,
  },
  specialties: {
    type: [String],
    required: true,
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
    required: true,
  },
  availability: {
    type: [String],
    required: true,
  },
  experience: {
    type: Number,
    required: true,
  },
});
