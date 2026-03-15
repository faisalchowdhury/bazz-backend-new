import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

export const addServicePrice = catchAsync(
  async (req: Request, res: Response) => {
    // const addServicePrice = await addServicePriceService(req);

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service price added",
      data: addServicePrice,
    });
  },
);
