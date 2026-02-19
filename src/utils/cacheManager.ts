// // cacheManager.ts
// import NodeCache from 'node-cache';

import { logger } from "../logger/logger";
// import redisClient from "./Redis";

// // Initialize cache with default TTL (e.g., 60 seconds) and check period
//  const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// export const getCacheKey = () => {
//  console.log(cache.keys());
// };

// export const getCache = (key: string) => {
//   return cache.get(key);
// };

// export const setCache = (key: string, value: any, ttl?: any) => {
//   return cache.set(key, value, ttl);
// };

// export const delCache = (key: string) => {
//   return cache.del(key);
// };

// src/utils/redisCacheManager.ts

/**
 * Retrieves all cache keys.
 * ⚠️ Be cautious using this in production as it can block Redis.
 * Consider using SCAN for large datasets.
 */
// export const getCacheKeys = async (): Promise<string[]> => {
//   try {
//     // WARNING: The KEYS command can be slow on large datasets. Use SCAN for production.
//     const keys = await redisClient.keys("*");
//     logger.info(`Cache Keys: ${keys}`);
//     return keys;
//   } catch (error) {
//     logger.error("Error fetching cache keys:", error);
//     return [];
//   }
// };

/**
 * Retrieves data from Redis cache.
 * @param key The cache key.
 * @returns The cached data or null if not found.
 */
// export const getCache = async (key: string): Promise<any> => {
//   try {
//     const data = await redisClient.get(key);

//     if (data) {
//       const parsedata = JSON.parse(data);
//       return parsedata;
//     }
//     return null;
//   } catch (error) {
//     logger.error(`Error getting cache for key "${key}":`, error);
//     return null;
//   }
// };

/**
 * Sets data in Redis cache with an optional TTL.
 * @param key The cache key.
 * @param value The data to cache.
 * @param ttl Time-To-Live in seconds (optional).
 * @returns Boolean indicating success or failure.
 */
// export const setCache = async (
//   key: string,
//   value: any,
//   ttl?: number,
// ): Promise<boolean> => {
//   try {
//     //   console.log(value,"------------->")
//     const stringValue = JSON.stringify(value);
//     if (ttl) {
//       await redisClient.set(key, stringValue, "EX", ttl);
//     } else {
//       await redisClient.set(key, stringValue);
//     }
//     return true;
//   } catch (error) {
//     logger.error(`Error setting cache for key "${key}":`, error);
//     return false;
//   }
// };

/**
 * Deletes data from Redis cache.
 * @param key The cache key.
 * @returns Number of keys removed.
 */
// export const delCache = async (key: string): Promise<number> => {
//   try {
//     const result = await redisClient.del(key);
//     return result;
//   } catch (error) {
//     logger.error(`Error deleting cache for key "${key}":`, error);
//     return 0;
//   }
// };
