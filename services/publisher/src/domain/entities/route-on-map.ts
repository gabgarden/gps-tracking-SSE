export interface RouteConfig {
  readonly name: string;
  /** [lng, lat] */
  readonly start: readonly [number, number];
  /** [lng, lat] */
  readonly end: readonly [number, number];
}

/** Route geometry as [lng, lat] points. */
export type RouteCoordinates = readonly [number, number][];
