export interface ICacheService {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  flush(): Promise<void>;
  keys(): Promise<string[]>;
}
