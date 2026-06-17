import { Document, Types } from "mongoose";

export interface IUpdate extends Document {
  trainerUserId: Types.ObjectId; // ref → User (trainer's user account)
  userId: Types.ObjectId; // ref → User (the specific user receiving update)
  title: string;
  description: string;
  isRead: boolean; // user marks as read
  createdAt: Date;
  updatedAt: Date;
}
