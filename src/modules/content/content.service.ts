import { Request } from "express";
import { IContent } from "./content.interface";
import { ContentModel } from "./content.model";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";

export const createContentService = async (req: Request) => {
  try {
    const { trainerUserId, title, categoryId, intensity, description } =
      req.body;

    const payload = {
      trainerUserId,
      title,
      categoryId,
      intensity,
      description,
    } as IContent;

    if (req.file) {
      payload.video = `/media/${req.file.filename}`;
    }

    const createContent = await ContentModel.create(payload);
  } catch (err) {
    console.log(err);
  }
};

export const getMyVideosService = async (req: Request) => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const userId = user.id;

    const myVideos = await ContentModel.find({ trainerUserId: userId });
    return myVideos;
  } catch (err) {
    console.log(err);
  }
};

export const getVideoService = async (req: Request) => {
  try {
    const { contentId } = req.params;
    const video = await ContentModel.findOne({
      contentId,
    });
    return video;
  } catch (err) {
    console.log(err);
  }
};
