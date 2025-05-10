import {CacheFactory, CacheType} from "./cache-factory";

const CACHE_TYPE = (process.env.CACHE_TYPE as CacheType) || "memory";

export const cache = CacheFactory.getCache(CACHE_TYPE);

export const cacheKeys = {
  analytics: (userId: string) => `analytics:${userId}`,
  user: (userId: string) => `activities:${userId}`,
  activities: (userId: string, assistantName: string, page: number, limit: number) =>
    `activities:${userId}:${assistantName}:${page}:${limit}`,
};
