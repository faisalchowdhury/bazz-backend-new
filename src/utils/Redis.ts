// src/utils/redis.ts
import Redis from "ioredis";
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB } from "../config";
import { logger } from "../logger/logger";

// Initialize Redis client
const redisClient = new Redis({
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
  password: REDIS_PASSWORD || undefined, // Optional
  db: Number(REDIS_DB) || 0, // Optional, default DB 0
  retryStrategy: (attempt) => {
    const delay = Math.min(attempt * 50, 2000); // Exponential backoff: 50ms, 100ms, ..., up to 2000ms
    logger.warn(
      `Redis retry attempt ${attempt}. Reconnecting in ${delay}ms...`
    );
    return delay;
  },
  // Optional: Add more configurations as needed
});

// Event listeners for Redis
redisClient.on("connect", () => {
  logger.info("📡 Redis connecting...");
});

redisClient.on("ready", () => {
  logger.info("🔴 Redis client is ready to use");
});

redisClient.on("error", (err) => {
  logger.error("Redis error:", err);
});

redisClient.on("close", () => {
  logger.warn("Redis connection closed");
});

redisClient.on("reconnecting", (delay: any, attempt: any) => {
  logger.info(
    `🔄 Reconnecting to Redis (Attempt ${attempt}, next retry in ${delay}ms)...`
  );
});
export const connectRedis = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    redisClient.once("ready", () => {
      logger.info("🚀 Redis connected successfully 🚀");
      resolve();
    });

    redisClient.once("error", (err) => {
      logger.error("❌ Redis connection error during startup:", err);
      reject(err);
    });
  });
};

// export default redisClient;
