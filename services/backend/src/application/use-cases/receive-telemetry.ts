import type { CarMovementPublisher } from '../ports/car-movement-publisher.js';
import { createTelemetryUpdate, type Telemetry, type TelemetryUpdate } from '../../domain/entities/telemetry.js';

/** Receives a driver position, enriches it with domain rules, and publishes it. */
export class ReceiveTelemetry {
  constructor(private readonly publisher: CarMovementPublisher) {}

  async execute(telemetry: Telemetry): Promise<TelemetryUpdate> {
    const update = createTelemetryUpdate(telemetry, new Date());
    await this.publisher.publish(update);
    return update;
  }
}
