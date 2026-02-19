import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import { AdminController } from "./admin.controller";
import userVerification from "../../middlewares/userVerification";
const router = Router();
router
  .route("/change-user/status/:userId")
  .get(guardRole(["admin"]), AdminController.changeUserStatus);

// router.post(
//   "/add-commition-rate",
//   guardRole(["admin"]),
//   userVerification,
//   AdminController.addCommitionRate
// );
export const AdminRoutes = router;
