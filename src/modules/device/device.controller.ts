import { Request, Response } from "express";
import {
  getUserDevicesService,
  pairDeviceService,
  updateDeviceStatusService,
  unpairDeviceService,
  getDeviceMetricsService,
  saveDeviceMetricsService,
} from "./device.service";
import sendResponse from "../../utils/sendResponse";
import { IUserPayload } from "../../middlewares/roleGuard";

export const getUserDevices = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = (req as any).user as IUserPayload;
    const result = await getUserDevicesService(user.id);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Devices retrieved successfully",
      data: result,
    });
  } catch (err: any) {
    sendResponse(res, {
      statusCode: 500,
      success: false,
      message: err.message,
      data: null,
    });
  }
};

export const pairDevice = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = (req as any).user as IUserPayload;
    const { name, serialNumber } = req.body;

    if (!name || !serialNumber) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "name and serialNumber are required",
        data: null,
      });
      return;
    }

    const result = await pairDeviceService(user.id, req.body);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Device paired successfully",
      data: result,
    });
  } catch (err: any) {
    sendResponse(res, {
      statusCode: 400,
      success: false,
      message: err.message,
      data: null,
    });
  }
};

export const updateDeviceStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = (req as any).user as IUserPayload;
    const { deviceId } = req.params;
    const { isConnected } = req.body;

    if (isConnected === undefined) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "isConnected is required",
        data: null,
      });
      return;
    }

    const result = await updateDeviceStatusService(
      user.id,
      deviceId,
      isConnected,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Device status updated successfully",
      data: {
        _id: result._id,
        isConnected: result.isConnected,
      },
    });
  } catch (err: any) {
    sendResponse(res, {
      statusCode: 400,
      success: false,
      message: err.message,
      data: null,
    });
  }
};

export const unpairDevice = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = (req as any).user as IUserPayload;
    const { deviceId } = req.params;

    await unpairDeviceService(user.id, deviceId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Device removed successfully",
      data: null,
    });
  } catch (err: any) {
    sendResponse(res, {
      statusCode: 400,
      success: false,
      message: err.message,
      data: null,
    });
  }
};

export const getDeviceMetrics = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = (req as any).user as IUserPayload;
    const { deviceId } = req.params;

    const result = await getDeviceMetricsService(user.id, deviceId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Metrics retrieved successfully",
      data: result,
    });
  } catch (err: any) {
    sendResponse(res, {
      statusCode: 400,
      success: false,
      message: err.message,
      data: null,
    });
  }
};

export const saveDeviceMetrics = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = (req as any).user as IUserPayload;
    const { deviceId } = req.params;
    const { steps, heartRate, distanceMeters, deviceType, syncedAt } = req.body;

    if (
      steps === undefined ||
      heartRate === undefined ||
      distanceMeters === undefined ||
      !deviceType ||
      !syncedAt
    ) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message:
          "steps, heartRate, distanceMeters, deviceType, and syncedAt are required",
        data: null,
      });
      return;
    }

    await saveDeviceMetricsService(user.id, deviceId, req.body);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Metrics synced successfully",
      data: null,
    });
  } catch (err: any) {
    sendResponse(res, {
      statusCode: 400,
      success: false,
      message: err.message,
      data: null,
    });
  }
};
