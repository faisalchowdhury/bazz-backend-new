import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";
import { TrainerModel } from "./trainer.model";
import sendResponse from "../../utils/sendResponse";
import {
  addCertificateService,
  addPersonalDetailsService,
  addTexDocService,
} from "./trainer.service";

export const addTexdoc = catchAsync(async (req: Request, res: Response) => {
  const addTexdoc = await addTexDocService(req);
  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tex document uploaded successfully",
    data: addTexdoc,
  });
});

export const addPersonalDetails = catchAsync(
  async (req: Request, res: Response) => {
    const addPersonalDetails = await addPersonalDetailsService(req);
    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Personal details added successfully",
      data: addPersonalDetails,
    });
  },
);

export const addCertificate = catchAsync(
  async (req: Request, res: Response) => {
    const addCertificate = await addCertificateService(req);

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Certificate added successfully",
      data: addCertificate,
    });
  },
);
