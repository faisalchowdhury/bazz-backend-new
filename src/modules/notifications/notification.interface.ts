import { Document, Types } from "mongoose";

// Define the INotification type
export type INotification = {
  userId: Types.ObjectId;
  adminId: Types.ObjectId[]; // Optional array of ObjectId
  adminMsgTittle: string;
  adminMsg: string;
  userMsgTittle: string;
  userMsg: string;
  status: string;
  bookingId: string;
  isAdminRead: Boolean;
  isUserRead: Boolean;
} & Document;

//--------> for push notifications <----------------------
export type INotificationPayload = {
  title: string;
  body: string;
};
