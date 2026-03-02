import { Request } from "express";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";
import { IService } from "./service.interface";
import ApiError from "../../errors/ApiError";
import { ServiceModel } from "./service.model";

export const createServiceService = async (req: Request) => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const userId = user.id;

    const { name, description, minPrice, maxPrice } = req.body;
    const servicePayload = {
      trainerUserId: userId,
      name,
      description,
      minPrice,
      maxPrice,
    } as unknown as IService;

    console.log(servicePayload);
    if (req.file) {
      servicePayload.image = `/images/${req.file.filename}`;
    } else {
      throw new ApiError(400, "Image not found , image is required");
    }

    const createService = await ServiceModel.create(servicePayload);

    return createService;
  } catch (err) {
    console.log(err);
  }
};

export const getServicesService = async (req: Request) => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const userId = user.id;

    const getServices = await ServiceModel.find({ trainerUserId: userId });
    console.log(getServices);
    return getServices;
  } catch (err) {
    console.log(err);
  }
};

export const serviceByIdService = async (req: Request) => {
  try {
    const { serviceId } = req.params;

    const serviceByIdService = await ServiceModel.findOne({ _id: serviceId });

    return serviceByIdService;
  } catch (err) {
    console.log(err);
  }
};

export const updateServiceService = async (req: Request) => {
  const user = req.user as JwtPayloadWithUser;
  const userId = user.id;
  const { serviceId } = req.params;

  const isExist = await ServiceModel.findOne({ _id: serviceId });

  if (!isExist) {
    throw new ApiError(400, "Service not found");
  }

  const isAllowed = await ServiceModel.findOne({ _id: serviceId, userId });

  if (!isAllowed) {
    throw new ApiError(400, "User is not allowed to update this service");
  }
  const { name, description, minPrice, maxPrice } = req.body;
  const servicePayload = {
    name,
    description,
    minPrice,
    maxPrice,
  } as unknown as IService;

  console.log(servicePayload);
  console.log(req.file);
  if (req.file) {
    servicePayload.image = `/images/${req.file.filename}`;
  } else {
    throw new ApiError(400, "Image not found , image is required");
  }

  const updateService = await ServiceModel.findOneAndUpdate(
    { _id: serviceId },
    servicePayload,
    { new: true },
  );

  return updateService;
};
