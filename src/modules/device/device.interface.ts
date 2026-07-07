import { Document, Types } from "mongoose";

export interface IDeviceSession {
  steps: number;
  heartRate: number;
  distanceMeters: number;
  startedAt: Date;
  endedAt: Date;
  deviceType: string;
}

export interface IDevice extends Document {
  userId: Types.ObjectId;
  name: string;
  serialNumber: string;
  macAddress?: string;
  deviceType?: string;
  isConnected: boolean;
  isPrimary: boolean;
  lastSyncedAt?: Date;
  syncedAt?: Date;
  heartRate?: number;
  steps?: number;
  calories?: number;
  distance?: number;
  distanceMeters?: number;
  activeMinutes?: number;
  sessions?: IDeviceSession[];
  createdAt: Date;
  updatedAt: Date;
}
