import type { RedisClientType } from 'redis';
import type { Cache } from '../../application/ports/cache.js';

/** Redis-backed cache. Reuses the app's existing Redis connection (already used for pub/sub). */
export class RedisCache implements Cache {
  constructor(private readonly client: RedisClientType) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  }
}
