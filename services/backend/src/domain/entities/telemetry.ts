import { distanceKm, type Coordinates } from '../value-objects/coordinates.js';

export type { Coordinates };

/** Telemetry reported by a driver for an active order. */
export interface Telemetry {
  readonly orderId: string;
  readonly driverId: string;
  readonly position: Coordinates;
  readonly destination: Coordinates;
}

export interface TelemetryUpdate extends Telemetry {
  /** Straight-line distance from the reported position to the order destination. */
  readonly remainingDistanceKm: number;
  readonly receivedAt: string;
}

/** Builds a telemetry update with remaining distance and reception timestamp. */
export function createTelemetryUpdate(telemetry: Telemetry, receivedAt: Date): TelemetryUpdate {
  return {
    ...telemetry,
    remainingDistanceKm: Number(distanceKm(telemetry.position, telemetry.destination).toFixed(3)),
    receivedAt: receivedAt.toISOString(),
  };
}
