import { UpdateModel } from "./update.model";
import { UserModel } from "../user/user.model";
import { sendAppNotification } from "../notifications/notification.helper";

// ─────────────────────────────────────────────────────────────
// CREATE UPDATE
// Trainer sends an update to a specific user
// ─────────────────────────────────────────────────────────────

export const createUpdate = async (
  trainerUserId: string,
  userId: string,
  title: string,
  description: string,
) => {
  // Verify user exists
  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");

  const update = await UpdateModel.create({
    trainerUserId,
    userId,
    title,
    description,
    isRead: false,
  });

  // Send notification to the user
  const trainer = await UserModel.findById(trainerUserId).select("firstName lastName");
  const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}` : "Your Trainer";
  await sendAppNotification({
    userId,
    title: `New Update from ${trainerName} 📝`,
    message: title,
  });

  return update;
};

// ─────────────────────────────────────────────────────────────
// GET MY UPDATES (user sees their updates)
// Returns today's updates first, then older ones
// ─────────────────────────────────────────────────────────────

export const getMyUpdates = async (userId: string, limit = 20) => {
  return await UpdateModel.find({ userId })
    .populate("trainerUserId", "firstName lastName profilePicture")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// ─────────────────────────────────────────────────────────────
// GET TODAY'S UPDATES (user sees only today's updates)
// ─────────────────────────────────────────────────────────────

export const getTodaysUpdates = async (userId: string) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return await UpdateModel.find({
    userId,
    createdAt: { $gte: start, $lte: end },
  })
    .populate("trainerUserId", "firstName lastName profilePicture")
    .sort({ createdAt: -1 })
    .lean();
};

// ─────────────────────────────────────────────────────────────
// MARK AS READ
// User marks a specific update as read
// ─────────────────────────────────────────────────────────────

export const markAsRead = async (userId: string, updateId: string) => {
  const update = await UpdateModel.findOneAndUpdate(
    { _id: updateId, userId },
    { $set: { isRead: true } },
    { new: true },
  );

  if (!update) throw new Error("Update not found");
  return update;
};

// ─────────────────────────────────────────────────────────────
// MARK ALL AS READ
// User marks all unread updates as read
// ─────────────────────────────────────────────────────────────

export const markAllAsRead = async (userId: string) => {
  await UpdateModel.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } },
  );
};

// ─────────────────────────────────────────────────────────────
// GET UNREAD COUNT
// For notification badge on app
// ─────────────────────────────────────────────────────────────

export const getUnreadCount = async (userId: string) => {
  return await UpdateModel.countDocuments({ userId, isRead: false });
};

// ─────────────────────────────────────────────────────────────
// GET SENT UPDATES (trainer sees updates they sent)
// ─────────────────────────────────────────────────────────────

export const getSentUpdates = async (trainerUserId: string, limit = 20) => {
  return await UpdateModel.find({ trainerUserId })
    .populate("userId", "firstName lastName profilePicture")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// ─────────────────────────────────────────────────────────────
// DELETE UPDATE (trainer deletes their own update)
// ─────────────────────────────────────────────────────────────

export const deleteUpdate = async (trainerUserId: string, updateId: string) => {
  const update = await UpdateModel.findOneAndDelete({
    _id: updateId,
    trainerUserId,
  });

  if (!update) throw new Error("Update not found or does not belong to you");
  return update;
};
