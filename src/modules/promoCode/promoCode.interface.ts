import { Document, Types } from "mongoose";

// ─────────────────────────────────────────────────────────────
// PROMO CODE
// Pre-generated affiliate / website referral codes (~60k).
// Payment itself is handled on the frontend by RevenueCat.
// The backend only:
//   1. validates the code + tells the app which plan/price applies
//   2. after purchase, grants access to the DEFAULT app trainer
//      for the plan's duration
//
// Two categories:
//   website  → $19.99 for 3 months (1999 cents / 90 days)
//   affiliate→ $9.99  for 1 month  ( 999 cents / 30 days)
// ─────────────────────────────────────────────────────────────

export type TPromoType = "website" | "affiliate";
export type TPromoStatus = "active" | "redeemed" | "disabled";

export interface IPromoCode extends Document {
  code: string; // unique, stored UPPERCASE

  type: TPromoType;

  // Plan this code unlocks (snapshot — defaulted by type at import,
  // stored per-code so pricing can vary per batch later)
  priceCents: number; // e.g. 1999 or 999  (informational; RevenueCat charges)
  durationDays: number; // e.g. 90 or 30
  label: string; // e.g. "Website 3-Month Plan"

  // Optional: which RevenueCat product/offering the app should present
  revenueCatProductId?: string;

  // Single-use by default; bump maxUses to share a code with an audience
  maxUses: number; // default 1
  usedCount: number; // default 0

  status: TPromoStatus;

  // Import batch tag (e.g. the PDF filename / date) for bookkeeping
  batchId?: string;

  // Last redeemer (useful for single-use codes)
  redeemedByUserId?: Types.ObjectId;
  redeemedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────
// PROMO REDEMPTION
// One row per successful redemption — drives affiliate reporting
// (how many signups each code / code-type drove)
// ─────────────────────────────────────────────────────────────

export interface IPromoRedemption extends Document {
  promoCodeId: Types.ObjectId; // ref → PromoCode
  code: string; // denormalized for easy reporting
  type: TPromoType;

  userId: Types.ObjectId; // who redeemed
  subscriptionId: Types.ObjectId; // ref → Subscription granted

  priceCents: number; // snapshot at redemption
  durationDays: number;

  // RevenueCat proof (optional — stored for audit)
  revenueCatTransactionId?: string;
  revenueCatProductId?: string;

  createdAt: Date;
  updatedAt: Date;
}
