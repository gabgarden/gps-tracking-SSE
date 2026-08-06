import type { RedisClientType } from 'redis';
import type { CarMovementPublisher } from '../../application/ports/car-movement-publisher.js';
import type { TelemetryUpdate } from '../../domain/entities/telemetry.js';

const CAR_MOVEMENTS_CHANNEL = process.env.CAR_MOVEMENTS_CHANNEL ?? 'car-movements';

export class RedisCarMovementPublisher implements CarMovementPublisher {
  constructor(private readonly client: RedisClientType) {}

  async publish(update: TelemetryUpdate): Promise<void> {
    await this.client.publish(CAR_MOVEMENTS_CHANNEL, JSON.stringify(update));
  }
}
