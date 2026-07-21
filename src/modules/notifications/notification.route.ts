import express from "express";
import {
  adminSendPushNotification,
  getMyNotification,
  getUnreadBadgeCount,
  getUnreadNotificationCount,
  readAllNotifications,
  updateUserStatus,
} from "./notification.controller";
import { guardRole } from "../../middlewares/roleGuard";

const router = express.Router();

router.get("/", guardRole(["admin", "user", "trainer"]), getMyNotification);
router.get("/badge-count", guardRole(["admin", "user", "trainer"]), getUnreadBadgeCount);
router.get("/unread-count", guardRole(["admin", "user", "trainer"]), getUnreadNotificationCount);
router.patch("/read-all", guardRole(["admin", "user", "trainer"]), readAllNotifications);
router.post("/send-push", guardRole("admin"), adminSendPushNotification);

//-----> inpout
// {
//   "fcmTokens": ["user_token_1", "user_token_2"],
//   "title": "Important Update",
//   "body": "Please check the latest news in your app."
// }

router.put("/update-status", guardRole("admin"), updateUserStatus);
export const NotificationRoutes = router;
