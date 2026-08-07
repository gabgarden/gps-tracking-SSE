export interface Coordinates {
  readonly lat: number;
  readonly lng: number;
}

const EARTH_RADIUS_KM = 6_371.0088;

/** Creates coordinates when lat/lng are within geographic bounds. */
export function createCoordinates(lat: number, lng: number): Coordinates | undefined {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng };
}

/** Straight-line (Haversine) distance between two points, in kilometers. */
export function distanceKm(origin: Coordinates, destination: Coordinates): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(destination.lat - origin.lat);
  const longitudeDelta = toRadians(destination.lng - origin.lng);
  const latitude1 = toRadians(origin.lat);
  const latitude2 = toRadians(destination.lat);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
