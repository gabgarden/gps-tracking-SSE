import type { Pool } from 'pg';
import type { TelemetryUpdate } from '../../domain/entities/telemetry.js';
import type { CarMovementHistoryRepository } from '../../application/ports/car-movement-history-repository.js';

export class PostgresCarMovementHistoryRepository implements CarMovementHistoryRepository {
  constructor(private readonly pool: Pool) {}

  async record(update: TelemetryUpdate): Promise<void> {
    await this.pool.query(
      `INSERT INTO car_movement
         (order_id, driver_id, lat, lng, destination_lat, destination_lng, route_name, remaining_distance_km, received_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        update.orderId,
        update.driverId,
        update.position.lat,
        update.position.lng,
        update.destination.lat,
        update.destination.lng,
        update.routeName ?? null,
        update.remainingDistanceKm,
        update.receivedAt,
      ],
    );
  }
}
