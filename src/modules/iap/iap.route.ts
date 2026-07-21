import express from "express";
import { verifyIAPController } from "./iap.controller";
import { guardRole } from "../../middlewares/roleGuard";

const router = express.Router();

router.post("/verify", guardRole("user"), verifyIAPController);

export const IAPRoutes = router;
