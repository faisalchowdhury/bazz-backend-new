import { Request, Response, NextFunction } from "express";

export const validate =
  (schema: any) => (req: Request, res: Response, next: NextFunction) => {
    // If schema is Zod-like
    if (schema && typeof schema.parse === "function") {
      try {
        schema.parse(req.body);
        next();
      } catch (error: any) {
        return res.status(400).json({
          success: false,
          message: error.errors?.[0]?.message || "Validation error",
        });
      }
    } else {
      // Fallback or skip if not a Zod schema
      next();
    }
  };
