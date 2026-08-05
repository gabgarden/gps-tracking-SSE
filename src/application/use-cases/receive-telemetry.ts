import type { CarMovementPublisher } from '../ports/car-movement-publisher.js';
import type { Telemetry, TelemetryUpdate } from '../../domain/entities/telemetry.js';

const EARTH_RADIUS_KM = 6_371.0088;

/** Receives a driver position, calculates the remaining distance and publishes it. */
export class ReceiveTelemetry {
  constructor(private readonly publisher: CarMovementPublisher) {}

  async execute(telemetry: Telemetry): Promise<TelemetryUpdate> {
    const remainingDistanceKm = haversineDistanceKm(telemetry.position, telemetry.destination);
    const update: TelemetryUpdate = {
      ...telemetry,
      remainingDistanceKm: Number(remainingDistanceKm.toFixed(3)),
      receivedAt: new Date().toISOString(),
    };

    await this.publisher.publish(update);
    return update;
  }
}

function haversineDistanceKm(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(destination.lat - origin.lat);
  const longitudeDelta = toRadians(destination.lng - origin.lng);
  const latitude1 = toRadians(origin.lat);
  const latitude2 = toRadians(destination.lat);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
