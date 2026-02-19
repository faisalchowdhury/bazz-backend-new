// admin.controller.ts

import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";
import { Types } from "mongoose";
import sendResponse from "../../utils/sendResponse";
import { AdminService } from "./admin.service";

// type UserPayload = {
//   id: string;
//   role: string;
//   email: string;
//   iat: number;
//   exp: number;
// };

const changeUserStatus = catchAsync(async (req: Request, res: Response) => {
  const { days } = req.query;
  if (!days)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Days is required if you want to suspend anyone!"
    );

  const updateStatus = await AdminService.updateStatus(
    new Types.ObjectId(req.params?.userId),
    Number(days)
  );

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User suspention action perform.",
    data: updateStatus,
  });
});

// const addCommitionRate = catchAsync(async (req: Request, res: Response) => {
//   const user = req.user as unknown as UserPayload;
//   const { commissionType, commissionRate } = req.body;

//   if (!user?.id || user.role !== "admin") {
//     throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized user");
//   }

//   const updatedRate = await CommissionModel.findOneAndUpdate(
//     { commissionType, commissionRate },
//     { new: true, upsert: true }
//   );

//   return sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Commission rate updated successfully",
//     data: updatedRate,
//   });
// });

export const AdminController = {
  changeUserStatus,
  // addCommitionRate,
};
