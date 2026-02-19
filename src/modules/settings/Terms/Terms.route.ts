import express from "express";

import { guardRole } from "../../../middlewares/roleGuard";
import { createTerms, getAllTerms, updateTerms } from "./Terms.controller";

const router = express.Router();
router.post("/create", guardRole(["admin"]), createTerms);
router.get("/", getAllTerms);
router.patch("/update", updateTerms);

export const TermsRoutes = router;
