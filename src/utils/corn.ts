import cron from "node-cron";
import {
  expireSubscriptions,
  getExpiringSoon,
  markReminderSent,
} from "../modules/subscription/subscription.service";
import { sendAppNotification } from "../modules/notifications/notification.helper";

// ─────────────────────────────────────────────────────────────
// NOTIFICATION HELPER
// Replace this with your actual notification service
// (FCM push notification / email / SMS)
// ─────────────────────────────────────────────────────────────

const sendNotification = async (
  userId: string,
  trainerId: string,
  title: string,
  body: string,
  type: "user" | "trainer",
) => {
  const targetId = type === "user" ? userId : trainerId;
  await sendAppNotification({
    userId: targetId,
    title,
    message: body,
  });
};

// ─────────────────────────────────────────────────────────────
// TASK 1 — EXPIRE SUBSCRIPTIONS
// Runs daily at midnight
// Marks past-due subscriptions as expired + removes user access
// ─────────────────────────────────────────────────────────────

const expireSubscriptionsTask = async () => {
  try {
    console.log("[CRON] Running subscription expiry check...");
    const count = await expireSubscriptions();
    console.log(`[CRON] Expired ${count} subscription(s)`);
  } catch (err: any) {
    console.error("[CRON] Expiry task failed:", err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// TASK 2 — SEND RENEWAL REMINDERS
// Notifies user + trainer at 7, 3, 1 days before expiry
// ─────────────────────────────────────────────────────────────

const sendRenewalRemindersTask = async () => {
  try {
    console.log("[CRON] Running renewal reminder check...");

    // Check 7 days
    const expiring7 = await getExpiringSoon(7);
    for (const sub of expiring7) {
      const user = sub.userId as any;
      const trainer = sub.trainerId as any;

      // Notify user
      await sendNotification(
        user._id.toString(),
        trainer.userId.toString(),
        "Subscription Expiring Soon",
        `Your training subscription with ${trainer.name} expires in 7 days. Contact your trainer to renew.`,
        "user",
      );

      // Notify trainer
      await sendNotification(
        user._id.toString(),
        trainer.userId.toString(),
        "Subscriber Expiring Soon",
        `${user.firstName} ${user.lastName}'s subscription expires in 7 days. Send a renewal invoice.`,
        "trainer",
      );

      await markReminderSent((sub as any)._id.toString(), 7);
    }

    // Check 3 days
    const expiring3 = await getExpiringSoon(3);
    for (const sub of expiring3) {
      const user = sub.userId as any;
      const trainer = sub.trainerId as any;

      await sendNotification(
        user._id.toString(),
        trainer.userId.toString(),
        "Subscription Expiring in 3 Days",
        `Your subscription with ${trainer.name} expires in 3 days. Renew now to keep your access.`,
        "user",
      );

      await sendNotification(
        user._id.toString(),
        trainer.userId.toString(),
        "Subscriber Expiring in 3 Days",
        `${user.firstName} ${user.lastName}'s subscription expires in 3 days. Send a renewal invoice now.`,
        "trainer",
      );

      await markReminderSent((sub as any)._id.toString(), 3);
    }

    // Check 1 day
    const expiring1 = await getExpiringSoon(1);
    for (const sub of expiring1) {
      const user = sub.userId as any;
      const trainer = sub.trainerId as any;

      await sendNotification(
        user._id.toString(),
        trainer.userId.toString(),
        "Subscription Expires Tomorrow!",
        `Your subscription with ${trainer.name} expires tomorrow. Pay your renewal invoice now to avoid losing access.`,
        "user",
      );

      await sendNotification(
        user._id.toString(),
        trainer.userId.toString(),
        "Subscriber Expires Tomorrow!",
        `${user.firstName} ${user.lastName}'s subscription expires tomorrow. Make sure they've paid their renewal invoice.`,
        "trainer",
      );

      await markReminderSent((sub as any)._id.toString(), 1);
    }

    console.log(
      `[CRON] Reminders sent — 7d: ${expiring7.length}, 3d: ${expiring3.length}, 1d: ${expiring1.length}`,
    );
  } catch (err: any) {
    console.error("[CRON] Reminder task failed:", err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// REGISTER ALL CRON JOBS
// Call this once in your app.ts / server.ts
// ─────────────────────────────────────────────────────────────

export const startCronJobs = () => {
  // Run every day at midnight
  // Format: second minute hour day month weekday
  cron.schedule("0 0 * * *", async () => {
    console.log("[CRON] Daily jobs running at midnight...");
    await expireSubscriptionsTask();
    await sendRenewalRemindersTask();
  });

  console.log("[CRON] All cron jobs registered ✅");
};
