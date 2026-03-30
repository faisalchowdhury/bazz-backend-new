import mongoose, { Schema } from "mongoose";
import { ITrainerKnowledgePack } from "./trainerKnowledge.interface";

const trainerKnowledgePackSchema = new Schema<ITrainerKnowledgePack>(
  {
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: "Trainer",
      required: true,
      unique: true, // one knowledge pack per trainer
      index: true,
    },

    // A — Programming
    daysPerWeek: { type: Number },
    preferredSplits: [{ type: String }],
    repRanges: { type: String },
    restTimes: { type: String },
    intensityMeasure: { type: String, enum: ["RPE", "RIR", "%1RM"] },
    deloadFrequency: { type: String },
    cardioPhilosophy: { type: String },

    // B — Exercise preferences
    mustUseExercises: [{ type: String }],
    avoidExercises: [{ type: String }],
    accessoryFavorites: [{ type: String }],

    // C — Nutrition
    proteinTarget: { type: String },
    hydrationRule: { type: String },
    maintenancePlate: { type: String },
    weekendStrategy: { type: String },

    // D — Client psychology
    consistencyMethod: { type: String },
    motivationDropResponse: { type: String },
    plateauProtocol: { type: String },
    deloadRules: { type: String },

    // G — Brand voice
    naturalPhrases: [{ type: String }],
    neverSayPhrases: [{ type: String }],
    coachingStyle: { type: String, enum: ["strict", "chill", "balanced"] },
  },
  { timestamps: true },
);

export const TrainerKnowledgePackModel = mongoose.model<ITrainerKnowledgePack>(
  "TrainerKnowledgePack",
  trainerKnowledgePackSchema,
);
