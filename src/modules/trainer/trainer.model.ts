import mongoose, { Schema, Document, Types } from "mongoose";

// ─────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────

export interface IExerciseStep {
  order: number;
  instruction: string;
  duration?: string;
  tip?: string;
}

export interface IExercise {
  _id?: Types.ObjectId;
  name: string;
  muscleGroup: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  equipment: string;
  sets: number;
  reps: string;
  restTime: string;
  rpe?: string;
  steps: IExerciseStep[];
  substitutions: {
    noBarbell?: string;
    noMachine?: string;
    homeOnly?: string;
    hotelGym?: string;
  };
  tags: string[];
  videoUrl?: string;
  isAiGenerated: boolean;
  isApproved: boolean;
}

export interface IExerciseBlock {
  _id?: Types.ObjectId;
  name: string;
  description?: string;
  category: string;
  exercises: IExercise[];
  isAiGenerated: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITrainerKnowledgePack {
  daysPerWeek?: number;
  preferredSplits?: string[];
  repRanges?: string;
  restTimes?: string;
  intensityMeasure?: "RPE" | "RIR" | "%1RM";
  deloadFrequency?: string;
  cardioPhilosophy?: string;
  mustUseExercises?: string[];
  avoidExercises?: string[];
  accessoryFavorites?: string[];
  proteinTarget?: string;
  hydrationRule?: string;
  maintenancePlate?: string;
  weekendStrategy?: string;
  consistencyMethod?: string;
  motivationDropResponse?: string;
  plateauProtocol?: string;
  deloadRules?: string;
  naturalPhrases?: string[];
  neverSayPhrases?: string[];
  coachingStyle?: "strict" | "chill" | "balanced";
}

export interface ITrainer extends Document {
  userId: Types.ObjectId;
  name: string;
  bio?: string;
  profileImage?: string;
  certifications: string[];
  specialty:
    | "maintain_physique"
    | "muscle_gain"
    | "weight_loss"
    | "nutrition"
    | "boxing";
  trainingStyleTags: string[];
  availabilityOptions: {
    aiProgram: boolean;
    oneOnOne: boolean;
  };
  systemPrompt?: string;
  knowledgePack?: ITrainerKnowledgePack;
  exerciseBlocks: IExerciseBlock[];
  subscriptionPrice: {
    free: boolean;
    paid?: number;
    premium?: number;
  };
  subscriberCount: number;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────
// SUB-SCHEMAS
// ─────────────────────────────────────────────────────────────

const exerciseStepSchema = new Schema<IExerciseStep>(
  {
    order: { type: Number, required: true },
    instruction: { type: String, required: true },
    duration: { type: String },
    tip: { type: String },
  },
  { _id: false },
);

const exerciseSchema = new Schema<IExercise>({
  name: { type: String, required: true },
  muscleGroup: {
    type: String,
    enum: [
      "upper_body",
      "chest",
      "back",
      "shoulders",
      "arms",
      "lower_body",
      "legs",
      "glutes",
      "core",
      "full_body",
      "cardio",
      "boxing",
    ],
    required: true,
  },
  difficulty: {
    type: String,
    enum: ["beginner", "intermediate", "advanced"],
    default: "intermediate",
  },
  equipment: { type: String, default: "none" },
  sets: { type: Number, required: true },
  reps: { type: String, required: true },
  restTime: { type: String, default: "60s" },
  rpe: { type: String },
  steps: [exerciseStepSchema],
  substitutions: {
    noBarbell: { type: String },
    noMachine: { type: String },
    homeOnly: { type: String },
    hotelGym: { type: String },
  },
  tags: [{ type: String }],
  videoUrl: { type: String },
  isAiGenerated: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
});

const exerciseBlockSchema = new Schema<IExerciseBlock>({
  name: { type: String, required: true },
  description: { type: String },
  category: {
    type: String,
    enum: [
      "upper_body",
      "chest",
      "back",
      "shoulders",
      "arms",
      "lower_body",
      "legs",
      "glutes",
      "core",
      "full_body",
      "cardio",
      "boxing",
    ],
    required: true,
  },
  exercises: [exerciseSchema],
  isAiGenerated: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const trainerKnowledgePackSchema = new Schema<ITrainerKnowledgePack>(
  {
    daysPerWeek: { type: Number },
    preferredSplits: [{ type: String }],
    repRanges: { type: String },
    restTimes: { type: String },
    intensityMeasure: { type: String, enum: ["RPE", "RIR", "%1RM"] },
    deloadFrequency: { type: String },
    cardioPhilosophy: { type: String },
    mustUseExercises: [{ type: String }],
    avoidExercises: [{ type: String }],
    accessoryFavorites: [{ type: String }],
    proteinTarget: { type: String },
    hydrationRule: { type: String },
    maintenancePlate: { type: String },
    weekendStrategy: { type: String },
    consistencyMethod: { type: String },
    motivationDropResponse: { type: String },
    plateauProtocol: { type: String },
    deloadRules: { type: String },
    naturalPhrases: [{ type: String }],
    neverSayPhrases: [{ type: String }],
    coachingStyle: { type: String, enum: ["strict", "chill", "balanced"] },
  },
  { _id: false },
);

// ─────────────────────────────────────────────────────────────
// MAIN TRAINER SCHEMA
// ─────────────────────────────────────────────────────────────

const trainerSchema = new Schema<ITrainer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Human Brand Layer
    name: { type: String, required: true },
    bio: { type: String },
    profileImage: { type: String },
    certifications: [{ type: String }],
    specialty: {
      type: String,
      enum: [
        "maintain_physique",
        "muscle_gain",
        "weight_loss",
        "nutrition",
        "boxing",
      ],
      required: true,
    },
    trainingStyleTags: [{ type: String }],
    availabilityOptions: {
      aiProgram: { type: Boolean, default: true },
      oneOnOne: { type: Boolean, default: false },
    },

    // AI Layer
    systemPrompt: { type: String },
    knowledgePack: trainerKnowledgePackSchema,

    // Exercise Library
    exerciseBlocks: [exerciseBlockSchema],

    // Monetization
    subscriptionPrice: {
      free: { type: Boolean, default: true },
      paid: { type: Number },
      premium: { type: Number },
    },

    subscriberCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ─────────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────────

trainerSchema.index({ specialty: 1, isActive: 1, isVerified: 1 });
trainerSchema.index({ userId: 1 });

// ─────────────────────────────────────────────────────────────
// MODEL
// ─────────────────────────────────────────────────────────────

export const TrainerModel = mongoose.model<ITrainer>("Trainer", trainerSchema);
