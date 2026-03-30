import mongoose, { Schema } from "mongoose";
import { IContent } from "./content.interface";

const contentSchema = new Schema<IContent>(
  {
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: "Trainer",
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    // Basic info
    title: { type: String, required: true },
    description: { type: String, required: true },
    contentType: {
      type: String,
      enum: ["video", "article", "pdf"],
      default: "video",
    },

    // Video specific
    videoUrl: { type: String },
    thumbnailUrl: { type: String },
    durationSeconds: { type: Number },

    // Exercise metadata
    exerciseName: { type: String },
    muscleGroups: [
      {
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
      },
    ],
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "all"],
      default: "all",
    },
    equipment: [{ type: String }],

    // Searchable tags
    tags: [{ type: String }],

    // Pre-built search text for AI matching
    // Auto-generated on save from title + description + exerciseName + tags
    searchText: { type: String, index: true },

    // Visibility
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Stats
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// ─────────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────────

contentSchema.index({ trainerId: 1, categoryId: 1 });
contentSchema.index({ trainerId: 1, isPublished: 1 });
contentSchema.index({ trainerId: 1, muscleGroups: 1 });
contentSchema.index({ trainerId: 1, exerciseName: 1 });
contentSchema.index({ tags: 1 });

// Full-text search index for AI matching
contentSchema.index({ searchText: "text", title: "text", description: "text" });

// ─────────────────────────────────────────────────────────────
// PRE-SAVE HOOK
// Auto-builds searchText from all metadata fields
// This is what AI uses to match user questions to content
// ─────────────────────────────────────────────────────────────

contentSchema.pre("save", function (next) {
  const parts = [
    this.title,
    this.description,
    this.exerciseName || "",
    this.muscleGroups?.join(" ") || "",
    this.equipment?.join(" ") || "",
    this.tags?.join(" ") || "",
    this.difficulty || "",
  ];
  this.searchText = parts.filter(Boolean).join(" ").toLowerCase();
  next();
});

// ─────────────────────────────────────────────────────────────
// MODEL — guard prevents OverwriteModelError
// ─────────────────────────────────────────────────────────────

export const ContentModel =
  (mongoose.models.Content as mongoose.Model<IContent>) ||
  mongoose.model<IContent>("Content", contentSchema);
