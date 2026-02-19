import httpStatus from "http-status";
import { NextFunction, Request, Response } from "express";
import { findUserById } from "../user/user.utils";
import { NotificationModel } from "./notification.model";
import catchAsync from "../../utils/catchAsync";
import sendError from "../../utils/sendError";
import sendResponse from "../../utils/sendResponse";
import ApiError from "../../errors/ApiError";
import { sendPushNotificationToMultiple } from "./pushNotification/pushNotification.controller";
import paginationBuilder from "../../utils/paginationBuilder";
import { IUserPayload } from "../../middlewares/roleGuard";
import { UserModel } from "../user/user.model";
import { JwtPayloadWithUser } from "../../middlewares/userVerification";

type UserPayload = {
  id: string;
  role: string;
  email: string;
  iat: number;
  exp: number;
};

// --- Role-based notification config ---
const roleNotificationConfig = {
  admin: {
    queryKey: "adminId",
    selectFields: "adminMsgTittle adminMsg status  createdAt updatedAt",
    readField: "isAdminRead",
    msgField: "adminMsg",
  },
  user: {
    queryKey: "userId",
    selectFields: "userMsg userMsgTittle status  createdAt updatedAt",
    readField: "isUserRead",
    msgField: "userMsg",
  },
} as any;

export const getMyNotification = catchAsync(
  async (req: Request, res: Response) => {
    const auth = req.user as JwtPayloadWithUser;
    if (!auth) throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    const user = await findUserById(auth.id);

    console.log("Authenticated User:", user);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
    // Role config
    const config =
      roleNotificationConfig[user.role as keyof typeof roleNotificationConfig];

    console.log("User Role:", config);
    if (!config) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid user role.");
    }
    const userInfo = await UserModel.findById(user._id).select(
      "name email image",
    );
    const query = { [config.queryKey]: user._id };
    const selectFields = config.selectFields;
    const readField = config.readField;
    const msgField = config.msgField;

    // Fetch notifications
    const notifications = await NotificationModel.find(query)
      .select(selectFields)
      .sort({ createdAt: -1 })
      .exec();
    const totalNotifications =
      await NotificationModel.countDocuments(query).exec();
    // Use paginationBuilder for pagination info
    const pagination = paginationBuilder({
      totalData: totalNotifications,
      currentPage: 1,
      limit: notifications.length,
    });
    const formattedNotifications = notifications.map((notification) => ({
      _id: notification._id,
      isReadable: notification[readField] as boolean,
      msg: notification[msgField] as string,
      status: notification.status as string,
      bookingId: notification.bookingId as string,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    }));
    if (formattedNotifications.length === 0) {
      return sendResponse(res, {
        statusCode: httpStatus.NO_CONTENT,
        success: true,
        message: "You have no notifications.",
        data: { notifications: [] },
      });
    }
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Here are your notifications.",
      data: {
        userInfo,
        notifications: formattedNotifications,
        pagination: {
          ...pagination,
        },
      },
    });
    // Mark notifications as read
    await NotificationModel.updateMany(
      { ...query, [readField]: false },
      { $set: { [readField]: true } },
    );
  },
);

export const getUnreadBadgeCount = catchAsync(
  async (req: Request, res: Response) => {
    const auth = req.user as IUserPayload;
    const user = await findUserById(auth.id);
    if (!user) throw new ApiError(404, "User not found");
    const config =
      roleNotificationConfig[user.role as keyof typeof roleNotificationConfig];
    if (!config) {
      return sendError(res, {
        statusCode: httpStatus.BAD_REQUEST,
        message: "Invalid user role.",
      });
    }
    const unreadCount = await NotificationModel.countDocuments({
      [config.queryKey]: user._id,
      [config.readField]: false,
    }).exec();
    const rawNotifications = await NotificationModel.find({
      [config.queryKey]: user._id,
      [config.msgField]: { $exists: true },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select(`${config.msgField} createdAt`)
      .exec();
    const latestNotifications = rawNotifications.map((notification) => ({
      msg: notification[config.msgField] || "",
      createdAt: notification.createdAt,
    }));
    const userInfo = await UserModel.findById(user._id).select(
      "name phone image",
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message:
        "Unread badge count and latest notifications retrieved successfully.",
      data: {
        userInfo,
        unreadCount,
        latestNotifications,
      },
    });
  },
);

export const adminSendPushNotification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fcmTokens, title, body } = req.body;
    if (!fcmTokens || !title || !body) {
      return res.status(400).json({
        message: "Missing required fields: fcmTokens, title, and body.",
      });
    }

    // Ensure fcmTokens is an array of strings
    let tokens: string[] = [];
    if (typeof fcmTokens === "string") {
      tokens = [fcmTokens];
    } else if (Array.isArray(fcmTokens)) {
      tokens = fcmTokens;
    } else {
      return res.status(400).json({
        message: "fcmTokens must be a string or an array of strings.",
      });
    }

    // Use the multicast helper to send notifications to all provided tokens
    const response = await sendPushNotificationToMultiple(tokens, {
      title,
      body,
    });
    return res
      .status(200)
      .json({ message: "Push notifications sent successfully.", response });
  } catch (error) {
    next(error);
  }
};

// handle notification on status change
export const updateUserStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId, status } = req.body;
    const admin = req.user as unknown as UserPayload;

    if (!admin) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Admin information missing.");
    }

    if (!userId || !status) {
      throw new ApiError(httpStatus.BAD_REQUEST, "UserId and status required");
    }

    // Update the user's status
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { status },
      { new: true },
    );
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    // 1. Create a notification in DB
    const notification = await NotificationModel.create({
      userId: user._id,
      adminId: admin.id,
      adminMsgTittle: "User Status Updated",
      adminMsg: `You changed status of ${user.name} to ${status}`,
      userMsgTittle: "Account Status Update",
      userMsg: `Your account status has been updated to "${status}" by admin.`,
    });

    // // 2. Send push notification (if user has fcmToken)
    // if (user.fcmToken) {
    //   await sendPushNotificationToMultiple([user.fcmToken], {
    //     title: "Account Status Changed",
    //     body: `Your status is now: ${status}`,
    //   });
    // }

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User status updated and notification sent",
      data: { user, notification },
    });
  } catch (err) {
    next(err);
  }
};

type CreateStatusNotificationParams = {
  userId: string;
  status:
    | "accepted"
    | "rejected"
    | "completed"
    | "cancelled"
    | "mark_as_done"
    | string;
  updatedBy: "barber" | "customer";
  bookingId: string;
};

export const createStatusNotification = async ({
  userId,
  status,
  updatedBy,
  bookingId,
}: CreateStatusNotificationParams) => {
  const messages: Record<string, string> = {
    accepted: "Your booking has been accepted.",
    rejected: "Your booking has been rejected.",
    completed: "Your booking is completed.",
    cancelled: "Your booking has been cancelled.",
    mark_as_done: "Your booking has been marked as done.",
  };

  const msg = messages[status] || "Your booking status has been updated.";

  return await NotificationModel.create({
    userId,
    msgTitle: "Booking Status Update",
    userMsg: `${updatedBy} updated the booking. Status: ${status}.`,
    status,
    bookingId,
    isRead: false,
  });
};
