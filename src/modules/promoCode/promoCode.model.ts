import mongoose, { Schema } from "mongoose";
import { IPromoCode, IPromoRedemption } from "./promoCode.interface";

// ─────────────────────────────────────────────────────────────
// PROMO CODE MODEL
// ─────────────────────────────────────────────────────────────

const promoCodeSchema = new Schema<IPromoCode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["website", "affiliate"],
      required: true,
      index: true,
    },

    priceCents: { type: Number, required: true },
    durationDays: { type: Number, required: true },
    label: { type: String, required: true },

    revenueCatProductId: { type: String },

    maxUses: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["active", "redeemed", "disabled"],
      default: "active",
      index: true,
    },

    batchId: { type: String, index: true },

    redeemedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    redeemedAt: { type: Date },
  },
  { timestamps: true },
);

export const PromoCodeModel =
  (mongoose.models.PromoCode as mongoose.Model<IPromoCode>) ||
  mongoose.model<IPromoCode>("PromoCode", promoCodeSchema);

// ─────────────────────────────────────────────────────────────
// PROMO REDEMPTION MODEL
// ─────────────────────────────────────────────────────────────

const promoRedemptionSchema = new Schema<IPromoRedemption>(
  {
    promoCodeId: {
      type: Schema.Types.ObjectId,
      ref: "PromoCode",
      required: true,
      index: true,
    },
    code: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["website", "affiliate"],
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },

    priceCents: { type: Number, required: true },
    durationDays: { type: Number, required: true },

    revenueCatTransactionId: { type: String },
    revenueCatProductId: { type: String },
  },
  { timestamps: true },
);

export const PromoRedemptionModel =
  (mongoose.models.PromoRedemption as mongoose.Model<IPromoRedemption>) ||
  mongoose.model<IPromoRedemption>("PromoRedemption", promoRedemptionSchema);
