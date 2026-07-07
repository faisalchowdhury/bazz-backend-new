import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import userVerification from "../../middlewares/userVerification";
import { handleDefaultContentUpload } from "../../multer/defaultContentUpload";
import { DefaultContentController } from "./defaultContent.controller";

const router = Router();

router.get("/", DefaultContentController.listDefaultContent);
router.get("/:id", DefaultContentController.getDefaultContentById);

router.post(
  "/",
  userVerification,
  guardRole(["admin"]),
  handleDefaultContentUpload,
  DefaultContentController.createDefaultContent,
);
router.put(
  "/:id",
  userVerification,
  guardRole(["admin"]),
  handleDefaultContentUpload,
  DefaultContentController.updateDefaultContent,
);
router.delete(
  "/:id",
  userVerification,
  guardRole(["admin"]),
  DefaultContentController.deleteDefaultContent,
);

export const DefaultContentRoutes = router;
