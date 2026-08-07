/** Outbound DTO for the backend telemetry HTTP API. */
export interface TelemetryPayload {
  readonly orderId: string;
  readonly driverId: string;
  readonly lat: number;
  readonly lng: number;
  readonly destinationLat: number;
  readonly destinationLng: number;
}
