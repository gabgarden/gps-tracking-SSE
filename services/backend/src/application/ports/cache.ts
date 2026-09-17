/** Output port for a simple read/write cache with TTL. Implementation may be Redis, memory, etc. */
export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}
