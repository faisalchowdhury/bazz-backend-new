import express from "express";
import { guardRole } from "../../middlewares/roleGuard";
import { createContent, getMyVideos, getvideo } from "./content.controller";
import upload from "../../multer/multer";

const route = express.Router();

route.post(
  "/create-content",
  guardRole("trainer"),
  upload.single("video"),
  createContent,
);

route.get("/my-videos", guardRole(["trainer"]), getMyVideos);
route.get("/video/:contentId", guardRole(["trainer"]), getvideo);
export const ContentRoutes = route;
