import { AboutModel } from "./About.model";

type AboutData = {
  sanitizedContent: string;
};

export const createAboutInDB = async (aboutData: AboutData) => {
  const newAbout = new AboutModel({ description: aboutData.sanitizedContent });
  const savedAbout = await newAbout.save();
  return savedAbout;
};

export const getAllAboutFromDB = async () => {
  const about = await AboutModel.find().sort({ createdAt: -1 });
  return about;
};

export const updateAboutInDB = async (newData: string) => {
  const updatedAbout = await AboutModel.findOneAndUpdate(
    {},
    { description: newData },
    { new: true, upsert: true },
  );

  return updatedAbout;
};
