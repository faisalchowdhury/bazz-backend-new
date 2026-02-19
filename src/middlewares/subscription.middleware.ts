import { Request, Response, NextFunction } from "express";
import {
  ProfileDocument,
  ProfileModel,
} from "../modules/profile/profile.model";
import {
  SubscriptionDocument,
  SubscriptionModel,
} from "../modules/subscription/subscription.model";

export interface IReq extends Request {
  profile?: ProfileDocument;
  subscription?: SubscriptionDocument;
}

export const checkSubscription = async (
  req: IReq,
  res: Response,
  next: NextFunction,
) => {
  const { publicId } = req.params;
  const profile = await ProfileModel.findOne({ publicId });
  if (!profile) return res.status(404).send("Profile not found");

  const subscription = await SubscriptionModel.findOne({
    profileId: profile._id,
  });

  if (!subscription || subscription.status !== "ACTIVE")
    return res.status(403).send("Subscription inactive");

  if (subscription.endDate < new Date()) {
    subscription.status = "EXPIRED";
    await subscription.save();
    return res.status(403).send("Subscription expired");
  }

  req.profile = profile;
  req.subscription = subscription;

  next();
};
