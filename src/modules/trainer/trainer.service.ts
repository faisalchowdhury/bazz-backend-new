import { Request } from "express";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";
import { TrainerModel } from "./trainer.model";

export const addTexDocService = async (data: Request) => {
  const user = data.user as JwtPayloadWithUser;
  const userId = user.id;

  const isExistingTrainer = await TrainerModel.findOne({ userId });

  if (isExistingTrainer) {
    throw new Error("Trainer tex document already exists");
  }

  if (!data.file) {
    throw new Error("No file uploaded");
  }
  const trainerPayload: any = { userId };
  trainerPayload.texDocument = `/documents/${data.file.filename}`;

  const updatedTrainer = await TrainerModel.insertOne(trainerPayload);
};

export const addPersonalDetailsService = async (data: Request) => {
  const user = data.user as JwtPayloadWithUser;
  const userId = user.id;

  const { fullName, userName, specialties, experience, availability } =
    data.body;

  const validAvailability =
    availability.length > 0 &&
    availability.length < 7 &&
    Array.isArray(availability);

  if (!validAvailability) {
    throw new Error(
      "Invalid availability. It should be an array with 1 to 6 days.",
    );
  }

  const trainerPayload: any = {
    fullName,
    userName,
    specialties,
    experience: Number(experience),
    availability,
  };

  const updatedTrainer = await TrainerModel.findOneAndUpdate(
    { userId },
    trainerPayload,
    { new: true },
  );

  return updatedTrainer;
};

export const addCertificateService = async (data: Request) => {
  const user = data.user as JwtPayloadWithUser;
  const userId = user.id;

  const { name, institute, type, certificateId } = data.body;

  const certificatePayload = {
    name,
    institute,
    type,
    certificateId,
  };

  const updatedTrainer = await TrainerModel.findOneAndUpdate(
    { userId },
    { $push: { certificates: certificatePayload } },
    { new: true },
  );

  return updatedTrainer;
};
