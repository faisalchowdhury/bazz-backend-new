import express from "express";
import { guardRole } from "../../middlewares/roleGuard";

import {
  createService,
  deleteServiceController,
  getServices,
  serviceById,
  updateServiceController,
} from "./service.controller";
import upload from "../../multer/multer";

const router = express.Router();

router.post(
  "/create-service",
  guardRole(["trainer"]),
  upload.single("image"),
  createService,
);

router.get("/my-services", guardRole(["trainer"]), getServices);

router.get(
  "/get-service/:serviceId",
  guardRole(["user", "trainer"]),
  serviceById,
);

router.patch(
  "/update-service/:serviceId",
  guardRole("trainer"),
  upload.single("image"),
  updateServiceController,
);

router.delete(
  "/delete-service/:serviceId",
  guardRole("trainer"),
  deleteServiceController,
);

export const ServiceRoutes = router;
