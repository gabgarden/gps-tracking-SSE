export interface TelemetryPayload {
  readonly orderId: string;
  readonly driverId: string;
  readonly lat: number;
  readonly lng: number;
  readonly destinationLat: number;
  readonly destinationLng: number;
}
