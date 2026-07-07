import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import { AdminController } from "./admin.controller";

const router = Router();
router
  .route("/change-user/status/:userId")
  .get(guardRole(["admin"]), AdminController.changeUserStatus);

export const AdminRoutes = router;
