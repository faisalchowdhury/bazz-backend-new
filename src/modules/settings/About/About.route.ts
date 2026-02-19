import express from "express";

import { guardRole } from "../../../middlewares/roleGuard";
import { createAbout, getAllAbout, updateAbout } from "./About.controller";

const router = express.Router();
router.post("/create", guardRole(["admin"]), createAbout);
router.get("/", getAllAbout);
router.patch("/update", updateAbout);

export const AboutRoutes = router;
