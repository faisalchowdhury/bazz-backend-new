import { Request, Response } from "express";

import { registerService, loginService } from "./auth.service";

import { z } from "zod";
import catchAsync from "../../utils/catchAsync";

export const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

export const register = catchAsync(async (req: Request, res: Response) => {
  const data = await registerService(req.body);
  res.status(201).json(data);
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const data = await loginService(req.body.email, req.body.password);
  res.json(data);
});
