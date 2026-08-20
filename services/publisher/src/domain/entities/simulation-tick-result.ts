export interface RoutePoint {
  readonly lat: number;
  readonly lng: number;
}

export interface TelemetrySnapshot {
  readonly orderId: string;
  readonly driverId: string;
  readonly lat: number;
  readonly lng: number;
  readonly destinationLat: number;
  readonly destinationLng: number;
  readonly routeName: string;
  /** Remaining OSRM geometry still to be traveled, including the current point. */
  readonly route: readonly RoutePoint[];
}

export interface CompletedDelivery {
  readonly orderId: string;
  readonly driverId: string;
  readonly routeName: string;
  readonly durationMs: number;
}

export interface SimulationProgress {
  readonly routeIndex: number;
  readonly step: number;
  readonly totalSteps: number;
  readonly routeName: string;
}

export type SimulationTickResult =
  | { readonly kind: 'telemetry'; readonly telemetry: TelemetrySnapshot; readonly progress: SimulationProgress }
  | { readonly kind: 'completed'; readonly delivery: CompletedDelivery; readonly nextRouteIndex: number };
