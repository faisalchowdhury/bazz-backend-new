import { Document, Types } from "mongoose";

// ─────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────

export type TContentType = "video" | "article" | "pdf";
export type TDifficultyLevel = "beginner" | "intermediate" | "advanced" | "all";
export type TMuscleGroup =
  | "upper_body"
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "lower_body"
  | "legs"
  | "glutes"
  | "core"
  | "full_body"
  | "cardio"
  | "boxing";

// ─────────────────────────────────────────────────────────────
// CONTENT INTERFACE
// ─────────────────────────────────────────────────────────────

export interface IContent extends Document {
  trainerId: Types.ObjectId; // ref → Trainer
  categoryId: Types.ObjectId; // ref → Category

  // Basic info
  title: string;
  description: string; // detailed description — used by AI for matching
  contentType: TContentType;

  // Video specific
  videoUrl?: string; // hosted video URL (e.g. S3, YouTube, Vimeo)
  thumbnailUrl?: string;
  durationSeconds?: number; // video length in seconds

  // Exercise metadata — used by AI to match user questions to relevant content
  exerciseName?: string; // e.g. "Bench Press", "Pull Up"
  muscleGroups: TMuscleGroup[];
  difficulty: TDifficultyLevel;
  equipment?: string[]; // e.g. ["barbell", "bench"]

  // Searchable tags — AI uses these for matching
  // e.g. ["compound", "push", "form guide", "beginner friendly", "chest day"]
  tags: string[];

  // AI search metadata — pre-built summary for fast AI matching
  // Combine title + description + exerciseName + tags into one searchable string
  searchText: string;

  // Visibility
  isPublished: boolean;
  isActive: boolean;

  // Stats
  viewCount: number;

  createdAt: Date;
  updatedAt: Date;
}
