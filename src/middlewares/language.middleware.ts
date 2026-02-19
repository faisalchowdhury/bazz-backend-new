import { Request, Response, NextFunction } from "express";

export const detectLanguage = (
  req: any,
  _res: Response,
  next: NextFunction
) => {
  const headerLang = req.headers["accept-language"];
  const queryLang = req.query.lang as string;

  req.lang = (queryLang || headerLang || "en").toString().split(",")[0];
  next();
};
