/** Remaining planned path from the current position to the destination. */
export interface RoutePoint {
  readonly lat: number;
  readonly lng: number;
}

/** Outbound DTO for the backend telemetry HTTP API. */
export interface TelemetryPayload {
  readonly orderId: string;
  readonly driverId: string;
  readonly lat: number;
  readonly lng: number;
  readonly destinationLat: number;
  readonly destinationLng: number;
  readonly routeName?: string;
  /** Remaining OSRM geometry still to be traveled, including the current point. */
  readonly route?: readonly RoutePoint[];
}
