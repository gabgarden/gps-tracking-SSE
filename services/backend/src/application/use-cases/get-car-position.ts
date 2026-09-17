import type { TelemetryUpdate } from '../../domain/entities/telemetry.js';
import type { Cache } from '../ports/cache.js';
import { carPositionCacheKey } from './receive-telemetry.js';

/** Serves the last known car position from cache, so a new SSE client doesn't wait for the next telemetry tick. */
export class GetCarPosition {
  constructor(private readonly cache: Cache) {}

  async execute(orderId: string): Promise<TelemetryUpdate | null> {
    return this.cache.get<TelemetryUpdate>(carPositionCacheKey(orderId));
  }
}
