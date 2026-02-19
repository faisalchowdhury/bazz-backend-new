import express from "express";
import {
  adminSendPushNotification,
  getMyNotification,
  getUnreadBadgeCount,
  updateUserStatus,
} from "./notification.controller";
import { guardRole } from "../../middlewares/roleGuard";

const router = express.Router();

router.get("/", guardRole(["admin", "user"]), getMyNotification);
router.get("/badge-count", guardRole(["admin", "user"]), getUnreadBadgeCount);
router.post("/send-push", guardRole("admin"), adminSendPushNotification);

//-----> inpout
// {
//   "fcmTokens": ["user_token_1", "user_token_2"],
//   "title": "Important Update",
//   "body": "Please check the latest news in your app."
// }

router.put("/update-status", guardRole("admin"), updateUserStatus);
export const NotificationRoutes = router;
