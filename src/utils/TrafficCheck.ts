import { Request, Response, NextFunction } from "express"; // Import types
import dayjs from "dayjs";
import { logger } from "../logger/logger";

// Variables to track traffic
export let totalTraffic = 0; // Export totalTraffic
export const dailyTraffic = new Map<string, number>(); // Export dailyTraffic

// Middleware to log traffic with correct types
export const rootLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const today = dayjs().format("YYYY-MM-DD"); // Get today's date in YYYY-MM-DD format

  // Increment total traffic
  totalTraffic++;

  // Increment today's traffic
  dailyTraffic.set(today, (dailyTraffic.get(today) || 0) + 1);

  // Log the visit
  logger.info(
    `Root endpoint hit by IP: ${req.ip} on ${new Date().toISOString()}`,
  );

  next(); // Call next() to pass control to the next middleware/route handler
};
