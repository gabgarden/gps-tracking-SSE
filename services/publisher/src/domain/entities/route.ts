export interface RouteConfig {
  readonly name: string;
  readonly start: readonly [number, number];
  readonly end: readonly [number, number];
}

export type RouteCoordinates = readonly [number, number][];
