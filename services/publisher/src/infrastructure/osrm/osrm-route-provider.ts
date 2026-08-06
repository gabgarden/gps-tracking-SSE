import type { RouteConfig, RouteCoordinates } from '../../domain/entities/route.js';
import type { RouteProvider } from '../../application/ports/route-provider.js';

interface RouteResponse {
  routes: Array<{
    geometry: {
      coordinates: RouteCoordinates;
    };
  }>;
}

/** Fetches driving routes from the public OSRM API. */
export class OsrmRouteProvider implements RouteProvider {
  constructor(private readonly baseUrl = 'https://router.project-osrm.org') {}

  async getRouteCoordinates(route: RouteConfig): Promise<RouteCoordinates> {
    const [startLng, startLat] = route.start;
    const [endLng, endLat] = route.end;
    const url = `${this.baseUrl}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro ao buscar rota no OSRM: ${response.statusText}`);
    }

    const data = (await response.json()) as RouteResponse;
    return data.routes[0].geometry.coordinates;
  }
}
