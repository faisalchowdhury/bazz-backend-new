import express from "express";

import { guardRole } from "../../../middlewares/roleGuard";
import {
  createPrivacy,
  getAllPrivacy,
  updatePrivacy,
} from "./Privacy.controller";

const router = express.Router();
router.post("/create", guardRole(["admin"]), createPrivacy);
router.get("/", getAllPrivacy);
router.patch("/update", guardRole(["admin"]), updatePrivacy);

export const PrivacyRoutes = router;
