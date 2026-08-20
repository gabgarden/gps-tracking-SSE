import type { RouteConfig, RouteCoordinates } from './route-on-map.js';
import type { SimulationTickResult } from './simulation-tick-result.js';

export interface DeliverySimulationOptions {
  readonly routes: readonly RouteConfig[];
  readonly driverId: string;
  readonly now?: number;
  readonly random?: () => number;
}

/**
 * Domain model for a driver cycling through delivery routes.
 * Knows order IDs, step progression and when a delivery completes — not I/O.
 */
export class DeliverySimulation {
  private routeIndex: number;
  private stepIndex = 0;
  private routeStartedAt: number;
  private completing = false;

  private constructor(
    private readonly routes: readonly RouteConfig[],
    private readonly driverId: string,
    private readonly random: () => number,
    now: number,
  ) {
    this.routeIndex = this.pickRouteIndex();
    this.routeStartedAt = now;
  }

  static start(options: DeliverySimulationOptions): DeliverySimulation {
    if (options.routes.length === 0) {
      throw new Error('DeliverySimulation requires at least one route');
    }

    return new DeliverySimulation(
      options.routes,
      options.driverId,
      options.random ?? Math.random,
      options.now ?? Date.now(),
    );
  }

  get currentRouteIndex(): number {
    return this.routeIndex;
  }

  get currentRoute(): RouteConfig {
    return this.routes[this.routeIndex];
  }

  orderIdFor(routeIndex: number): string {
    return `simulated-order-${routeIndex + 1}`;
  }

  /** Advances one step along the current route geometry. */
  tick(coordinates: RouteCoordinates, now = Date.now()): SimulationTickResult | undefined {
    if (this.completing) return undefined;

    if (this.stepIndex >= coordinates.length) {
      this.completing = true;
      const completedRouteIndex = this.routeIndex;
      const completedRoute = this.routes[completedRouteIndex];
      const nextRouteIndex = this.pickRouteIndex(completedRouteIndex);

      return {
        kind: 'completed',
        delivery: {
          orderId: this.orderIdFor(completedRouteIndex),
          driverId: this.driverId,
          routeName: completedRoute.name,
          durationMs: now - this.routeStartedAt,
        },
        nextRouteIndex,
      };
    }

    const currentIndex = this.stepIndex;
    const [lng, lat] = coordinates[currentIndex];
    const route = this.currentRoute;
    const [destinationLng, destinationLat] = route.end;

    this.stepIndex += 1;

    return {
      kind: 'telemetry',
      telemetry: {
        orderId: this.orderIdFor(this.routeIndex),
        driverId: this.driverId,
        lat,
        lng,
        destinationLat,
        destinationLng,
        routeName: route.name,
        route: remainingRoute(coordinates, currentIndex),
      },
      progress: {
        routeIndex: this.routeIndex,
        step: this.stepIndex,
        totalSteps: coordinates.length,
        routeName: route.name,
      },
    };
  }

  /** Switches to a new route after a completed delivery (or failed switch recovery). */
  beginRoute(routeIndex: number, now = Date.now()): void {
    this.routeIndex = routeIndex;
    this.stepIndex = 0;
    this.routeStartedAt = now;
    this.completing = false;
  }

  /** Clears the completing lock so the same route can retry after a failed handoff. */
  abortCompletion(): void {
    this.completing = false;
  }

  private pickRouteIndex(exclude?: number): number {
    if (this.routes.length <= 1) return 0;

    let next: number;
    do {
      next = Math.floor(this.random() * this.routes.length);
    } while (next === exclude);

    return next;
  }
}

/** Converts remaining OSRM [lng, lat] points into { lat, lng } for the telemetry API. */
function remainingRoute(
  coordinates: RouteCoordinates,
  fromIndex: number,
): { readonly lat: number; readonly lng: number }[] {
  return coordinates.slice(fromIndex).map(([pointLng, pointLat]) => ({
    lat: pointLat,
    lng: pointLng,
  }));
}
