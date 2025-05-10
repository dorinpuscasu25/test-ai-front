import {PersistentNodeCache} from "persistent-node-cache";
import {ICacheService} from "./cache-interface";

export class NodeCacheService implements ICacheService {
  private static instance: NodeCacheService;
  private cache: PersistentNodeCache;

  private constructor(options: {stdTTL?: number; checkperiod?: number; dir?: string} = {}) {
    this.cache = new PersistentNodeCache("app-cache", 10000, options.dir || undefined, {
      stdTTL: options.stdTTL || 3600,
      checkperiod: options.checkperiod || 120,
    });
  }

  public static getInstance(options?: {stdTTL?: number; checkperiod?: number}): NodeCacheService {
    if (!NodeCacheService.instance) {
      NodeCacheService.instance = new NodeCacheService(options);
    }
    return NodeCacheService.instance;
  }

  public async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  public async set<T>(key: string, value: T, ttl = 3600): Promise<boolean> {
    return this.cache.set<T>(key, value, ttl);
  }

  public async del(key: string): Promise<boolean> {
    return this.cache.del(key) > 0;
  }

  public async flush(): Promise<void> {
    this.cache.flushAll();
  }

  public async keys(): Promise<string[]> {
    return this.cache.keys();
  }
}
