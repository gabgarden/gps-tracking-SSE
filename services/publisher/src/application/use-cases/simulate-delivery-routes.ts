import type { RouteConfig } from '../../domain/entities/route.js';
import type { RouteProvider } from '../ports/route-provider.js';
import type { TelemetrySender } from '../ports/telemetry-sender.js';

export interface SimulateDeliveryRoutesOptions {
  readonly routes: readonly RouteConfig[];
  readonly driverId: string;
  readonly intervalMs: number;
  readonly onStep?: (info: { routeIndex: number; step: number; totalSteps: number; routeName: string }) => void;
  readonly onRouteChange?: (info: { routeIndex: number; routeName: string }) => void;
}

/** Simulates a driver following random routes and sending telemetry at each step. */
export class SimulateDeliveryRoutes {
  private readonly routesCache = new Map<number, Awaited<ReturnType<RouteProvider['getRouteCoordinates']>>>();

  constructor(
    private readonly routeProvider: RouteProvider,
    private readonly telemetrySender: TelemetrySender,
  ) {}

  async start(options: SimulateDeliveryRoutesOptions): Promise<void> {
    let currentRouteIndex = this.getRandomRouteIndex(options.routes.length);
    let stepIndex = 0;

    options.onRouteChange?.({
      routeIndex: currentRouteIndex,
      routeName: options.routes[currentRouteIndex].name,
    });

    let routeCoordinates = await this.getRouteCoordinates(options.routes, currentRouteIndex);

    setInterval(async () => {
      if (stepIndex >= routeCoordinates.length) {
        currentRouteIndex = this.getRandomRouteIndex(options.routes.length, currentRouteIndex);
        options.onRouteChange?.({
          routeIndex: currentRouteIndex,
          routeName: options.routes[currentRouteIndex].name,
        });

        try {
          routeCoordinates = await this.getRouteCoordinates(options.routes, currentRouteIndex);
          stepIndex = 0;
        } catch (error) {
          console.error('Falha ao alternar rota:', error);
          return;
        }
      }

      const [lng, lat] = routeCoordinates[stepIndex];
      const route = options.routes[currentRouteIndex];
      const [destinationLng, destinationLat] = route.end;

      try {
        await this.telemetrySender.send({
          orderId: `simulated-order-${currentRouteIndex + 1}`,
          driverId: options.driverId,
          lat,
          lng,
          destinationLat,
          destinationLng,
        });

        options.onStep?.({
          routeIndex: currentRouteIndex,
          step: stepIndex + 1,
          totalSteps: routeCoordinates.length,
          routeName: route.name,
        });
      } catch (error) {
        console.error('Falha ao enviar telemetria:', error);
      }

      stepIndex++;
    }, options.intervalMs);
  }

  private async getRouteCoordinates(routes: readonly RouteConfig[], routeIndex: number) {
    if (this.routesCache.has(routeIndex)) {
      return this.routesCache.get(routeIndex)!;
    }

    const coordinates = await this.routeProvider.getRouteCoordinates(routes[routeIndex]);
    this.routesCache.set(routeIndex, coordinates);
    return coordinates;
  }

  private getRandomRouteIndex(routeCount: number, currentIndex?: number): number {
    if (routeCount <= 1) return 0;

    let newIndex: number;
    do {
      newIndex = Math.floor(Math.random() * routeCount);
    } while (newIndex === currentIndex);

    return newIndex;
  }
}
