const TELEMETRY_URL = process.env.TELEMETRY_URL ?? 'http://localhost:8080/telemetry';

// Lista de 5 rotas em Campos dos Goytacazes ao redor do IFF Centro: [ [lng, lat] de início, [lng, lat] de destino ]
const ROUTES_CONFIG = [
  {
    name: 'IFF Centro -> Boulevard Shopping',
    start: [-41.3245, -21.7545], // IFF Centro (Rua Doutor Siqueira)
    end: [-41.3392, -21.7681],   // Boulevard Shopping
  },
  {
    name: 'Rodoviária Roberto Silveira -> IFF Centro',
    start: [-41.3283, -21.7588], // Rodoviária
    end: [-41.3245, -21.7545],   // IFF Centro
  },
  {
    name: 'Jardim do Liceu -> Pelinca',
    start: [-41.3208, -21.7552], // Jardim do Liceu
    end: [-41.3321, -21.7635],   // Av. Pelinca
  },
  {
    name: 'Cais do Lapa -> UENF',
    start: [-41.3189, -21.7482], // Beira-Rio / Cais do Lapa
    end: [-41.2934, -21.7612],   // UENF
  },
  {
    name: 'Av. 28 de Março (Parque Tamandaré) -> IFF Centro',
    start: [-41.3350, -21.7601], // Parque Tamandaré
    end: [-41.3245, -21.7545],   // IFF Centro
  },
];

interface RouteResponse {
  routes: Array<{
    geometry: {
      coordinates: [number, number][]; // Array de [lng, lat]
    };
  }>;
}

const routesCache: Map<number, [number, number][]> = new Map();

async function getRouteCoordinates(routeIndex: number): Promise<[number, number][]> {
  if (routesCache.has(routeIndex)) {
    return routesCache.get(routeIndex)!;
  }

  const { start, end } = ROUTES_CONFIG[routeIndex];
  const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erro ao buscar rota no OSRM: ${response.statusText}`);
  }

  const data = (await response.json()) as RouteResponse;
  const coordinates = data.routes[0].geometry.coordinates;

  routesCache.set(routeIndex, coordinates);
  return coordinates;
}

function getRandomRouteIndex(currentIndex?: number): number {
  let newIndex: number;
  do {
    newIndex = Math.floor(Math.random() * ROUTES_CONFIG.length);
  } while (newIndex === currentIndex && ROUTES_CONFIG.length > 1);
  return newIndex;
}

async function startSimulation() {
  console.log(`Simulador iniciado. Enviando telemetria para ${TELEMETRY_URL}...`);

  let currentRouteIndex = getRandomRouteIndex();
  let routeCoordinates: [number, number][] = [];
  let stepIndex = 0;

  try {
    console.log(`Carregando Rota #${currentRouteIndex + 1}: ${ROUTES_CONFIG[currentRouteIndex].name}`);
    routeCoordinates = await getRouteCoordinates(currentRouteIndex);

    setInterval(async () => {
      if (stepIndex >= routeCoordinates.length) {
        currentRouteIndex = getRandomRouteIndex(currentRouteIndex);
        console.log(`\nRota finalizada! Sorteando Rota #${currentRouteIndex + 1}: ${ROUTES_CONFIG[currentRouteIndex].name}`);
        
        try {
          routeCoordinates = await getRouteCoordinates(currentRouteIndex);
          stepIndex = 0;
        } catch (err) {
          console.error('Falha ao alternar rota:', err);
          return;
        }
      }

      const [lng, lat] = routeCoordinates[stepIndex];
      const [destinationLng, destinationLat] = ROUTES_CONFIG[currentRouteIndex].end;
      const telemetry = {
        orderId: `simulated-order-${currentRouteIndex + 1}`,
        driverId: 'simulated-driver-1',
        lat,
        lng,
        destinationLat,
        destinationLng,
      };

      try {
        const response = await fetch(TELEMETRY_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(telemetry),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        console.log(`[Rota ${currentRouteIndex + 1} - Passo ${stepIndex + 1}/${routeCoordinates.length}] Telemetria enviada.`);
      } catch (error) {
        console.error('Falha ao enviar telemetria:', error);
      }

      stepIndex++;
    }, 1500);

  } catch (error) {
    console.error('Falha ao inicializar a simulação:', error);
  }
}

void startSimulation();
