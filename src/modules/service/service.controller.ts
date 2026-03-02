import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import {
  createServiceService,
  getServicesService,
  serviceByIdService,
  updateServiceService,
} from "./service.service";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";
import { ServiceModel } from "./service.model";
import ApiError from "../../errors/ApiError";

export const createService = catchAsync(async (req: Request, res: Response) => {
  const createService = await createServiceService(req);

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Service created successfully",
    data: createService,
  });
});

export const getServices = catchAsync(async (req: Request, res: Response) => {
  const getServices = await getServicesService(req);

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Services fetched successfully",
    data: getServices,
  });
});

export const serviceById = catchAsync(async (req: Request, res: Response) => {
  const getServices = await serviceByIdService(req);

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Service fetched successfully",
    data: getServices,
  });
});

export const updateServiceController = catchAsync(
  async (req: Request, res: Response) => {
    const updateService = await updateServiceService(req);

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service created successfully",
      data: updateService,
    });
  },
);

export const deleteServiceController = catchAsync(
  async (req: Request, res: Response) => {
    const { serviceById } = req.params;
    const user = req.user as JwtPayloadWithUser;
    const userId = user.id;

    const isExist = await ServiceModel.findOne({ _id: serviceById });

    if (!isExist) {
      throw new ApiError(400, "Service not exist");
    }

    const isAllowed = await ServiceModel.findOne({ _id: serviceById, userId });

    if (!isAllowed) {
      throw new ApiError(400, "Your are not allowed to delete this service");
    }

    const deleteService = await ServiceModel.deleteOne({ _id: serviceById });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service deleted successfully",
      data: deleteService,
    });
  },
);
