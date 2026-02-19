import { PrivacyModel } from "./Privacy.model";

type PrivacyData = {
  sanitizedContent: string;
};

export const createPrivacyInDB = async (privacyData: PrivacyData) => {
  const newPrivacy = new PrivacyModel({
    description: privacyData.sanitizedContent,
  });
  const savedPrivacy = await newPrivacy.save();
  return savedPrivacy;
};

export const getAllPrivacyFromDB = async () => {
  const privacy = await PrivacyModel.find().sort({ createdAt: -1 });
  return privacy;
};

export const updatePrivacyInDB = async (newData: string) => {
  const updatedPrivacy = await PrivacyModel.findOneAndUpdate(
    {},
    { description: newData },
    { new: true, upsert: true },
  );

  return updatedPrivacy;
};
