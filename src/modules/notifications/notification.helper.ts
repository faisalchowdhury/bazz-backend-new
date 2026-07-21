import mongoose from "mongoose";
import { UserModel } from "../user/user.model";
import { emitNotification } from "../../utils/socket";
import { sendPushNotification } from "./pushNotification/pushNotification.controller";

export const sendAppNotification = async ({
  userId,
  title,
  message,
}: {
  userId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
}) => {
  try {
    const userObjectId =
      typeof userId === "string"
        ? new mongoose.Types.ObjectId(userId)
        : userId;

    // 1. Emit real-time notification (Socket.IO) and save to DB
    await emitNotification({
      userId: userObjectId,
      userMsgTittle: title,
      userMsg: message,
      adminMsgTittle: title,
      adminMsg: message,
    });

    // 2. Fetch target user to get fcmToken
    const user = await UserModel.findById(userObjectId).select("fcmToken");
    if (user && user.fcmToken) {
      // 3. Dispatch Firebase Push Notification
      try {
        await sendPushNotification(user.fcmToken, {
          title,
          body: message,
        });
      } catch (pushError) {
        console.error("Firebase Push Notification failed (possibly due to commented out init/missing credentials):", pushError);
      }
    }
  } catch (error) {
    console.error("Failed to send app notification:", error);
  }
};

export const sendAdminNotification = async ({
  userId,
  title,
  message,
}: {
  userId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
}) => {
  try {
    const userObjectId =
      typeof userId === "string"
        ? new mongoose.Types.ObjectId(userId)
        : userId;

    // 1. Emit real-time notification (Socket.IO) to Admins and save to DB
    await emitNotification({
      userId: userObjectId,
      adminMsgTittle: title,
      adminMsg: message,
      userMsgTittle: "",
      userMsg: "",
    });

    // 2. Fetch admins to send push notifications
    const admins = await UserModel.find({ role: "admin" }).select("fcmToken");
    for (const admin of admins) {
      if (admin.fcmToken) {
        try {
          await sendPushNotification(admin.fcmToken, {
            title,
            body: message,
          });
        } catch (pushError) {
          console.error("Firebase Push Notification to Admin failed:", pushError);
        }
      }
    }
  } catch (error) {
    console.error("Failed to send admin notification:", error);
  }
};
