import type { RouteConfig, RouteCoordinates } from '../../domain/entities/route.js';

/** Input port for fetching route geometry from an external routing service. */
export interface RouteProvider {
  getRouteCoordinates(route: RouteConfig): Promise<RouteCoordinates>;
}
