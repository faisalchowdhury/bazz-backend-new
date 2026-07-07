import mongoose, { Schema } from "mongoose";
import { IDevice } from "./device.interface";

const deviceSchema = new Schema<IDevice>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    serialNumber: {
      type: String,
      required: true,
    },
    macAddress: {
      type: String,
    },
    deviceType: {
      type: String,
    },
    isConnected: {
      type: Boolean,
      default: false,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    lastSyncedAt: {
      type: Date,
    },
    syncedAt: {
      type: Date,
    },
    heartRate: { type: Number, default: 0 },
    steps: { type: Number, default: 0 },
    calories: { type: Number, default: 0 },
    distance: { type: Number, default: 0 },
    distanceMeters: { type: Number, default: 0 },
    activeMinutes: { type: Number, default: 0 },
    sessions: [
      {
        steps: { type: Number, required: true },
        heartRate: { type: Number, required: true },
        distanceMeters: { type: Number, required: true },
        startedAt: { type: Date, required: true },
        endedAt: { type: Date, required: true },
        deviceType: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Index to ensure a user doesn't pair the same device multiple times
deviceSchema.index({ userId: 1, serialNumber: 1 }, { unique: true });

export const DeviceModel =
  (mongoose.models.Device as mongoose.Model<IDevice>) ||
  mongoose.model<IDevice>("Device", deviceSchema);
