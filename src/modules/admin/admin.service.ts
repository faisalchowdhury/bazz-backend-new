import mongoose, { Types } from "mongoose";
import { UserModel } from "../user/user.model";

// admin.service.ts
const updateStatus = async (userId: Types.ObjectId, days: number) => {
  let extendDays = new Date();
  extendDays.setDate(extendDays.getDate() + days);
  const user = await UserModel.findByIdAndUpdate(
    userId,
    {
      lockUntil: days ? extendDays : null,
    },
    { new: true }
  ).select("lockUntil");

  return user;
};
const getUsers = async (query: object) => {
  const clients = await UserModel.find(query).select(
    "frist_name last_name email phone city"
  );
  return clients;
};

// Helper function to calculate the start and end of the current week
function getCurrentWeekDates() {
  const currentDate = new Date();

  // Convert current date to Bangladesh Standard Time (UTC+6)
  const bangladeshTime = new Date(
    currentDate.toLocaleString("en-US", { timeZone: "Asia/Dhaka" })
  );

  // Set the start of the week (Sunday) at midnight in BST
  const startOfWeek = new Date(bangladeshTime);
  startOfWeek.setDate(bangladeshTime.getDate() - bangladeshTime.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0); // Set to midnight (start of Sunday)

  // Set the end of the week (Saturday) at 23:59:59.999 in BST
  const endOfWeek = new Date(bangladeshTime);
  endOfWeek.setDate(bangladeshTime.getDate() + (6 - bangladeshTime.getDay())); // Saturday
  endOfWeek.setHours(23, 59, 59, 999); // Set to the end of the day (11:59:59.999 PM)

  return { startOfWeek, endOfWeek };
}

export const AdminService = {
  getUsers,
  updateStatus,
};
