import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";
import { verifyIAPSubscription } from "./iap.service";

export const verifyIAPController = catchAsync(async (req: Request, res: Response) => {
  const { platform, productId, purchaseId, verificationData } = req.body;
  const user = req.user as any;

  if (!user || !user.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }

  // 1. Request Validation
  if (!platform || !productId || !purchaseId || !verificationData) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing required fields");
  }

  if (platform !== "ios" && platform !== "android") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid platform");
  }

  // 2. Call service to verify and activate subscription
  const result = await verifyIAPSubscription(
    user.id,
    platform,
    productId,
    purchaseId,
    verificationData
  );

  // 3. Send successful HTTP 200 response
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription activated",
    data: result,
  });
});
