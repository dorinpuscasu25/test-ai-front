import {cache, cacheKeys} from "./cache";

export async function invalidateAnalyticsCache(userId: string): Promise<boolean> {
  try {
    const cacheKey = cacheKeys.analytics(userId);
    return await cache.del(cacheKey);
  } catch (error) {
    console.error("Error invalidating analytics cache:", error);
    return false;
  }
}

export async function invalidateActivitiesCache(userId: string): Promise<boolean> {
  try {
    const allKeys = await cache.keys();
    const userKeys = allKeys.filter((key) => key.startsWith(`activities:${userId}:`));

    let success = true;
    for (const key of userKeys) {
      const result = await cache.del(key);
      if (!result) success = false;
    }

    return success;
  } catch (error) {
    console.error("Error invalidating activities cache:", error);
    return false;
  }
}

export async function invalidateAllCaches(): Promise<boolean> {
  try {
    const allKeys = await cache.keys();

    let success = true;
    for (const key of allKeys) {
      const result = await cache.del(key);
      if (!result) success = false;
    }

    return success;
  } catch (error) {
    console.error("Error invalidating activities cache:", error);
    return false;
  }
}
