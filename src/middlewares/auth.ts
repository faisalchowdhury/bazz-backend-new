import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

export const protect = (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const token = auth.split(" ")[1];
  const decoded = verifyToken(token);

  req.user = decoded;
  next();
};

export const restrictTo =
  (...roles: string[]) =>
  (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
