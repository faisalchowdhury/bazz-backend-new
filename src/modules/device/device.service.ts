import { DeviceModel } from "./device.model";
import { IDevice, IDeviceSession } from "./device.interface";

export const getUserDevicesService = async (userId: string) => {
  return await DeviceModel.find({ userId }).sort({ createdAt: -1 }).lean();
};

export const pairDeviceService = async (
  userId: string,
  data: Partial<IDevice>,
) => {
  const existingCount = await DeviceModel.countDocuments({ userId });
  if (existingCount >= 3) {
    throw new Error("Maximum of 3 devices can be paired");
  }

  const existing = await DeviceModel.findOne({
    userId,
    serialNumber: data.serialNumber,
  });

  if (existing) {
    throw new Error("Device already paired");
  }

  // Validate supported device types if deviceType is provided
  const supportedDeviceTypes = ["apple_watch_s3", "fittech_a6", "fit_s3_ultra"];
  if (data.deviceType && !supportedDeviceTypes.includes(data.deviceType)) {
    throw new Error(
      `Unsupported device type. Supported types are: ${supportedDeviceTypes.join(", ")}`,
    );
  }

  return await DeviceModel.create({
    userId,
    ...data,
    isConnected: false, // Per Pair Device response spec: isConnected is false upon pair
    isPrimary: false,
  });
};

export const updateDeviceStatusService = async (
  userId: string,
  deviceId: string,
  isConnected: boolean,
) => {
  if (isConnected) {
    // Business Rule: Only one device can be connected at a time.
    // Disconnect all other devices for this user.
    await DeviceModel.updateMany(
      { userId, _id: { $ne: deviceId } },
      { $set: { isConnected: false } },
    );
  }

  const result = await DeviceModel.findOneAndUpdate(
    { _id: deviceId, userId },
    { $set: { isConnected } },
    { new: true },
  );

  if (!result) {
    throw new Error("Device not found");
  }

  return result;
};

export const unpairDeviceService = async (userId: string, deviceId: string) => {
  const result = await DeviceModel.findOneAndDelete({ _id: deviceId, userId });

  if (!result) {
    throw new Error("Device not found");
  }

  return result;
};

export const getDeviceMetricsService = async (
  userId: string,
  deviceId: string,
) => {
  const device = await DeviceModel.findOne({ _id: deviceId, userId }).lean();

  if (!device) {
    throw new Error("Device not found");
  }

  return {
    steps: device.steps || 0,
    heartRate: device.heartRate || 0,
    distanceMeters: device.distanceMeters || 0,
    calories: device.calories || 0,
    activeMinutes: device.activeMinutes || 0,
    deviceType: device.deviceType || "apple_watch_s3",
    syncedAt: device.syncedAt || device.lastSyncedAt || null,
    sessions: device.sessions || [],
  };
};

export const saveDeviceMetricsService = async (
  userId: string,
  deviceId: string,
  metricsData: {
    steps: number;
    heartRate: number;
    distanceMeters: number;
    deviceType: string;
    syncedAt: string | Date;
    calories?: number;
    activeMinutes?: number;
    sessions?: IDeviceSession[];
  },
) => {
  const device = await DeviceModel.findOne({ _id: deviceId, userId });

  if (!device) {
    throw new Error("Device not found");
  }

  // Validate supported device types
  const supportedDeviceTypes = ["apple_watch_s3", "fittech_a6", "fit_s3_ultra"];
  if (
    metricsData.deviceType &&
    !supportedDeviceTypes.includes(metricsData.deviceType)
  ) {
    throw new Error(
      `Unsupported device type. Supported types are: ${supportedDeviceTypes.join(", ")}`,
    );
  }

  // Update fields
  device.steps = metricsData.steps;
  device.heartRate = metricsData.heartRate;
  device.distanceMeters = metricsData.distanceMeters;
  device.deviceType = metricsData.deviceType;
  device.syncedAt = new Date(metricsData.syncedAt);
  device.lastSyncedAt = new Date(metricsData.syncedAt); // update deprecated field too

  if (metricsData.calories !== undefined) {
    device.calories = metricsData.calories;
  }
  if (metricsData.activeMinutes !== undefined) {
    device.activeMinutes = metricsData.activeMinutes;
  }

  if (metricsData.sessions && Array.isArray(metricsData.sessions)) {
    device.sessions = metricsData.sessions;
  }

  await device.save();

  return device;
};
