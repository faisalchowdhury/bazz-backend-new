import { Router } from "express";
import { register, login } from "./auth.controller";
const registerSchema: any = {
  body: {
    username: "string",
    password: "string",
  },
};
import { validate } from "../../middlewares/validate";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", login);

export default router;
