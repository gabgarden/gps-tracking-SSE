import type { CarMovementPublisher } from '../ports/car-movement-publisher.js';
import type { CarMovementHistoryRepository } from '../ports/car-movement-history-repository.js';
import type { Cache } from '../ports/cache.js';
import { createTelemetryUpdate, type Telemetry, type TelemetryUpdate } from '../../domain/entities/telemetry.js';

const CAR_POSITION_CACHE_TTL_SECONDS = 30;

export function carPositionCacheKey(orderId: string): string {
  return `car_position:${orderId}`;
}

/** Receives a driver position, enriches it with domain rules, persists it, caches it, and publishes it. */
export class ReceiveTelemetry {
  constructor(
    private readonly publisher: CarMovementPublisher,
    private readonly history: CarMovementHistoryRepository,
    private readonly cache: Cache,
  ) {}

  async execute(telemetry: Telemetry): Promise<TelemetryUpdate> {
    const update = createTelemetryUpdate(telemetry, new Date());
    await this.history.record(update);
    await this.cache.set(carPositionCacheKey(update.orderId), update, CAR_POSITION_CACHE_TTL_SECONDS);
    await this.publisher.publish(update);
    return update;
  }
}
