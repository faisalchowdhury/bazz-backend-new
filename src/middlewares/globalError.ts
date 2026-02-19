import { Request, Response, NextFunction } from "express";

export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = err.statusCode || 500;

  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};
