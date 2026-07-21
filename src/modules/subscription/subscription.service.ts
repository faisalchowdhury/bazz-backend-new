import { SubscriptionModel } from "./subscription.model";
import { UserModel } from "../user/user.model";
import { TrainerModel } from "../trainer/trainer.model";
import { sendAppNotification } from "../notifications/notification.helper";

// ─────────────────────────────────────────────────────────────
// GET SUBSCRIPTION STATUS
// ─────────────────────────────────────────────────────────────

export const getSubscriptionStatus = async (userId: string) => {
  const subscription = await SubscriptionModel.findOne({
    userId,
    status: "active",
  })
    .populate("trainerId", "name specialty profileImage anamAI")
    .populate("invoiceId", "amount description periodStart periodEnd pdfUrl")
    .lean();

  if (!subscription) {
    return {
      isActive: false,
      subscription: null,
      daysRemaining: 0,
    };
  }

  const now = new Date();
  const endDate = new Date(subscription.endDate);
  const daysRemaining = Math.max(
    0,
    Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return {
    isActive: true,
    subscription,
    daysRemaining,
  };
};

// ─────────────────────────────────────────────────────────────
// CANCEL SUBSCRIPTION
// ─────────────────────────────────────────────────────────────

export const cancelSubscription = async (
  userId: string,
  subscriptionId: string,
) => {
  const subscription = await SubscriptionModel.findOne({
    _id: subscriptionId,
    userId,
    status: "active",
  });
  if (!subscription) throw new Error("Active subscription not found");

  subscription.status = "cancelled";
  subscription.cancelledAt = new Date();
  await subscription.save();

  // Remove access from user
  await UserModel.findByIdAndUpdate(userId, {
    $unset: {
      subscribedTrainer: "",
      subscriptionStartDate: "",
      subscriptionEndDate: "",
    },
    $set: {
      subscriptionTier: "free",
    },
  });

  return subscription;
};

// ─────────────────────────────────────────────────────────────
// EXPIRE SUBSCRIPTIONS (called by cron job daily)
// ─────────────────────────────────────────────────────────────

export const expireSubscriptions = async () => {
  const now = new Date();

  // Find all active subscriptions that have passed endDate
  const expired = await SubscriptionModel.find({
    status: "active",
    endDate: { $lt: now },
  });

  for (const sub of expired) {
    sub.status = "expired";
    await sub.save();

    // Remove user access
    await UserModel.findByIdAndUpdate(sub.userId, {
      $unset: {
        subscribedTrainer: "",
        subscriptionStartDate: "",
        subscriptionEndDate: "",
      },
      $set: {
        subscriptionTier: "free",
      },
    });

    // Notify user about expired subscription
    try {
      const trainer = await TrainerModel.findById(sub.trainerId).select("name");
      const trainerName = trainer ? trainer.name : "your trainer";
      await sendAppNotification({
        userId: sub.userId.toString(),
        title: "Subscription Expired 🔴",
        message: `Your training subscription with "${trainerName}" has ended. Renew to continue your training access!`,
      });
    } catch (notifErr) {
      console.error("Failed to send subscription expired notification:", notifErr);
    }
  }

  return expired.length;
};

// ─────────────────────────────────────────────────────────────
// GET EXPIRING SUBSCRIPTIONS (for reminder notifications)
// Returns subscriptions expiring in exactly X days
// ─────────────────────────────────────────────────────────────

export const getExpiringSoon = async (daysFromNow: number) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  start.setDate(start.getDate() + daysFromNow);
  end.setDate(end.getDate() + daysFromNow + 1);

  const reminderField =
    daysFromNow === 7
      ? "reminderSent7Days"
      : daysFromNow === 3
        ? "reminderSent3Days"
        : "reminderSent1Day";

  return await SubscriptionModel.find({
    status: "active",
    endDate: { $gte: start, $lt: end },
    [reminderField]: false, // only ones we haven't notified yet
  })
    .populate("userId", "firstName lastName email")
    .populate("trainerId", "userId name")
    .lean();
};

// ─────────────────────────────────────────────────────────────
// MARK REMINDER SENT
// ─────────────────────────────────────────────────────────────

export const markReminderSent = async (
  subscriptionId: string,
  days: 7 | 3 | 1,
) => {
  const field =
    days === 7
      ? "reminderSent7Days"
      : days === 3
        ? "reminderSent3Days"
        : "reminderSent1Day";

  await SubscriptionModel.findByIdAndUpdate(subscriptionId, {
    $set: { [field]: true },
  });
};

// ─────────────────────────────────────────────────────────────
// GET TRAINER SUBSCRIPTIONS (trainer dashboard — active users)
// ─────────────────────────────────────────────────────────────

export const getTrainerSubscriptions = async (
  trainerId: string,
  status?: string,
) => {
  const query: any = { trainerId };
  if (status) query.status = status;
  else query.status = "active";

  return await SubscriptionModel.find(query)
    .populate("userId", "firstName lastName email profilePicture primaryGoal")
    .populate("invoiceId", "amount description periodStart periodEnd")
    .sort({ createdAt: -1 })
    .lean();
};
