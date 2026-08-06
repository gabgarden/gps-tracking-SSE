import type { RouteConfig } from '../domain/entities/route.js';
import { SimulateDeliveryRoutes } from '../application/use-cases/simulate-delivery-routes.js';
import { OsrmRouteProvider } from '../infrastructure/osrm/osrm-route-provider.js';
import { HttpTelemetrySender } from '../infrastructure/http/http-telemetry-sender.js';

const TELEMETRY_URL = process.env.TELEMETRY_URL ?? 'http://localhost:8080/telemetry';
const INTERVAL_MS = Number(process.env.SIMULATION_INTERVAL_MS ?? 1500);

const ROUTES: readonly RouteConfig[] = [
  {
    name: 'IFF Centro -> Boulevard Shopping',
    start: [-41.3245, -21.7545],
    end: [-41.3392, -21.7681],
  },
  {
    name: 'Rodoviária Roberto Silveira -> IFF Centro',
    start: [-41.3283, -21.7588],
    end: [-41.3245, -21.7545],
  },
  {
    name: 'Jardim do Liceu -> Pelinca',
    start: [-41.3208, -21.7552],
    end: [-41.3321, -21.7635],
  },
  {
    name: 'Cais do Lapa -> UENF',
    start: [-41.3189, -21.7482],
    end: [-41.2934, -21.7612],
  },
  {
    name: 'Av. 28 de Março (Parque Tamandaré) -> IFF Centro',
    start: [-41.3350, -21.7601],
    end: [-41.3245, -21.7545],
  },
];

async function bootstrap(): Promise<void> {
  console.log(`Simulador iniciado. Enviando telemetria para ${TELEMETRY_URL}...`);

  const simulator = new SimulateDeliveryRoutes(
    new OsrmRouteProvider(),
    new HttpTelemetrySender(TELEMETRY_URL),
  );

  await simulator.start({
    routes: ROUTES,
    driverId: 'simulated-driver-1',
    intervalMs: INTERVAL_MS,
    onRouteChange: ({ routeIndex, routeName }) => {
      console.log(`\nRota #${routeIndex + 1}: ${routeName}`);
    },
    onStep: ({ routeIndex, step, totalSteps }) => {
      console.log(`[Rota ${routeIndex + 1} - Passo ${step}/${totalSteps}] Telemetria enviada.`);
    },
  });
}

void bootstrap().catch((error) => {
  console.error('Falha ao inicializar a simulação:', error);
  process.exitCode = 1;
});
