import { Document } from "mongoose";

// ─────────────────────────────────────────────────────────────
// PLATFORM COMMISSION
// Admin sets one flat commission rate for the entire platform
// All trainer payments go through this rate
// e.g. 20% → trainer gets 80% of invoice amount
// ─────────────────────────────────────────────────────────────

export interface ICommission extends Document {
  // Flat commission percentage for all trainers
  // e.g. 20 means platform takes 20%, trainer gets 80%
  platformCommissionPercent: number;

  // Who last updated this
  updatedByAdminId: string;

  createdAt: Date;
  updatedAt: Date;
}
