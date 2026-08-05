import type { TelemetryUpdate } from '../../domain/entities/telemetry.js';

/** Output port used by telemetry to distribute updates in real time. */
export interface CarMovementPublisher {
  publish(update: TelemetryUpdate): Promise<void>;
}
