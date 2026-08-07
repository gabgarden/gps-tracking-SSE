import { DeliverySimulation } from '../../domain/entities/delivery-simulation.js';
import type { RouteConfig, RouteCoordinates } from '../../domain/entities/route-on-map.js';
import type { OrderStatusNotifier } from '../ports/order-status-notifier.js';
import type { RouteProvider } from '../ports/route-provider.js';
import type { TelemetrySender } from '../ports/telemetry-sender.js';

export interface SimulateDeliveryRoutesOptions {
  readonly routes: readonly RouteConfig[];
  readonly driverId: string;
  readonly intervalMs: number;
  readonly onStep?: (info: { routeIndex: number; step: number; totalSteps: number; routeName: string }) => void;
  readonly onRouteChange?: (info: { routeIndex: number; routeName: string }) => void;
  readonly onDeliveryCompleted?: (info: {
    orderId: string;
    routeName: string;
    durationMs: number;
  }) => void;
}

/** Orchestrates route fetching and outbound notifications around the delivery simulation domain. */
export class SimulateDeliveryRoutes {
  private readonly routesCache = new Map<number, RouteCoordinates>();

  constructor(
    private readonly routeProvider: RouteProvider,
    private readonly telemetrySender: TelemetrySender,
    private readonly orderStatusNotifier?: OrderStatusNotifier,
  ) {}

  async start(options: SimulateDeliveryRoutesOptions): Promise<void> {
    const simulation = DeliverySimulation.start({
      routes: options.routes,
      driverId: options.driverId,
    });

    options.onRouteChange?.({
      routeIndex: simulation.currentRouteIndex,
      routeName: simulation.currentRoute.name,
    });

    let routeCoordinates = await this.getRouteCoordinates(options.routes, simulation.currentRouteIndex);

    setInterval(async () => {
      const result = simulation.tick(routeCoordinates);
      if (!result) return;

      if (result.kind === 'completed') {
        if (this.orderStatusNotifier) {
          try {
            await this.orderStatusNotifier.notify({
              orderId: result.delivery.orderId,
              driverId: result.delivery.driverId,
              status: 'DELIVERED',
              routeName: result.delivery.routeName,
              durationMs: result.delivery.durationMs,
            });
            options.onDeliveryCompleted?.({
              orderId: result.delivery.orderId,
              routeName: result.delivery.routeName,
              durationMs: result.delivery.durationMs,
            });
          } catch (error) {
            console.error('Falha ao registrar entrega na auditoria:', error);
          }
        }

        options.onRouteChange?.({
          routeIndex: result.nextRouteIndex,
          routeName: options.routes[result.nextRouteIndex].name,
        });

        try {
          routeCoordinates = await this.getRouteCoordinates(options.routes, result.nextRouteIndex);
          simulation.beginRoute(result.nextRouteIndex);
        } catch (error) {
          console.error('Falha ao alternar rota:', error);
          simulation.abortCompletion();
        }
        return;
      }

      try {
        await this.telemetrySender.send(result.telemetry);
        options.onStep?.(result.progress);
      } catch (error) {
        console.error('Falha ao enviar telemetria:', error);
      }
    }, options.intervalMs);
  }

  private async getRouteCoordinates(routes: readonly RouteConfig[], routeIndex: number): Promise<RouteCoordinates> {
    const cached = this.routesCache.get(routeIndex);
    if (cached) return cached;

    const coordinates = await this.routeProvider.getRouteCoordinates(routes[routeIndex]);
    this.routesCache.set(routeIndex, coordinates);
    return coordinates;
  }
}
