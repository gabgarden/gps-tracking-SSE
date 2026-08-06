export interface Coordinates {
  readonly lat: number;
  readonly lng: number;
}

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
