import { Request, Response, NextFunction } from "express";

export const checkSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Stub unused middleware with missing dependencies to allow project compilation
  next();
};
