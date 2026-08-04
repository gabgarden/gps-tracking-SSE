import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const NOTIFICATIONS_CHANNEL = 'notifications';

const publisher = createClient({ url: REDIS_URL });
publisher.on('error', (err) => console.error('Erro no Redis Publisher:', err));

// Lista de 5 rotas em São Paulo: [ [lng, lat] de início, [lng, lat] de destino ]
const ROUTES_CONFIG = [
  {
    name: 'Praça da Sé -> MASP',
    start: [-46.633309, -23.55052],
    end: [-46.655881, -23.561414],
  },
  {
    name: 'Parque Ibirapuera -> Pinheiros',
    start: [-46.657634, -23.587416],
    end: [-46.691763, -23.567215],
  },
  {
    name: 'Estação da Luz -> Allianz Parque',
    start: [-46.635319, -23.536481],
    end: [-46.678722, -23.527537],
  },
  {
    name: 'Tatuapé -> Mooca',
    start: [-46.576201, -23.540452],
    end: [-46.597523, -23.569801],
  },
  {
    name: 'Brooklin -> Faria Lima',
    start: [-46.689102, -23.612015],
    end: [-46.682103, -23.582312],
  },
];

interface RouteResponse {
  routes: Array<{
    geometry: {
      coordinates: [number, number][]; // Array de [lng, lat]
    };
  }>;
}

/**
 * Cache local das rotas já buscadas no OSRM para evitar chamadas repetidas na rede
 */
const routesCache: Map<number, [number, number][]> = new Map();

/**
 * Busca a rota no OSRM (ou retorna do cache se já foi carregada)
 */
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

/**
 * Seleciona um índice de rota aleatório
 */
function getRandomRouteIndex(currentIndex?: number): number {
  let newIndex: number;
  do {
    newIndex = Math.floor(Math.random() * ROUTES_CONFIG.length);
  } while (newIndex === currentIndex && ROUTES_CONFIG.length > 1); // Evita repetir a mesma rota consecutivamente
  return newIndex;
}

async function startSimulation() {
  await publisher.connect();
  console.log(`Publisher conectado ao Redis! Publicando no canal "${NOTIFICATIONS_CHANNEL}"...`);

  let currentRouteIndex = getRandomRouteIndex();
  let routeCoordinates: [number, number][] = [];
  let stepIndex = 0;

  try {
    // Carrega a primeira rota sorteada
    console.log(`Carregando Rota #${currentRouteIndex + 1}: ${ROUTES_CONFIG[currentRouteIndex].name}`);
    routeCoordinates = await getRouteCoordinates(currentRouteIndex);

    setInterval(async () => {
      // Se concluiu a rota atual, sorteia uma nova
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
      const payload = JSON.stringify({ lat, lng });

      await publisher.publish(NOTIFICATIONS_CHANNEL, payload);
      console.log(`[Rota ${currentRouteIndex + 1} - Passo ${stepIndex + 1}/${routeCoordinates.length}] Posição enviada:`, payload);

      stepIndex++;
    }, 1500);

  } catch (error) {
    console.error('Falha ao inicializar a simulação:', error);
  }
}

void startSimulation();                     