import { Router } from "express";
import {
  getUserDevices,
  pairDevice,
  updateDeviceStatus,
  unpairDevice,
  getDeviceMetrics,
  saveDeviceMetrics,
} from "./device.controller";
import { guardRole } from "../../middlewares/roleGuard";

const router = Router();

// Allow 'user' to manage devices
router.get("/", guardRole("user"), getUserDevices);

router.post("/pair", guardRole("user"), pairDevice);

router.patch("/:deviceId/status", guardRole("user"), updateDeviceStatus);

router.delete("/:deviceId", guardRole("user"), unpairDevice);

router.get("/:deviceId/metrics", guardRole("user"), getDeviceMetrics);

router.post("/:deviceId/metrics", guardRole("user"), saveDeviceMetrics);

export const DeviceRoutes = router;
