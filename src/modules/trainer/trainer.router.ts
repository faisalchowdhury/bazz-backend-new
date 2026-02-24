import express from "express";
import { guardRole } from "../../middlewares/roleGuard";
import {
  addCertificate,
  addPersonalDetails,
  addTexdoc,
} from "./trainer.controller";
import upload from "../../multer/multer";

const router = express.Router();

router.post(
  "/upload-tex-doc",
  guardRole(["trainer"]),
  upload.single("texDoc"),
  addTexdoc,
);

router.post(
  "/add-personal-details",
  guardRole(["trainer"]),
  addPersonalDetails,
);

router.post("/add-certificate", guardRole(["trainer"]), addCertificate);
export const TrainerRoutes = router;
