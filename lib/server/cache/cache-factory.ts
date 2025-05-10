import {ICacheService} from "./cache-interface";
import {NodeCacheService} from "./node-cache.service";

// Add other implementations as needed
// import { RedisCacheService } from './redis-cache.service';

//here can add more type of caching redis, database etc
export type CacheType = "memory";

export class CacheFactory {
  static getCache(type: CacheType = "memory", options = {}): ICacheService {
    switch (type) {
      case "memory":
        return NodeCacheService.getInstance(options);
      // case 'redis':
      //   return RedisCacheService.getInstance(options);
      default:
        return NodeCacheService.getInstance(options);
    }
  }
}
