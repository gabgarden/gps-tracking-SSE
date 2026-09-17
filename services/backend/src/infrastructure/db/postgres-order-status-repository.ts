import type { Pool } from 'pg';
import type { OrderStatusAudit } from '@gps-tracking/shared/audit';
import type { OrderStatusRepository } from '../../application/ports/order-status-repository.js';

/**
 * Upserts the current order status and writes an outbox_event row in the same transaction,
 * so the OutboxRelay can reliably forward the change to the audit service without a
 * separate, uncoordinated publish call.
 */
export class PostgresOrderStatusRepository implements OrderStatusRepository {
  constructor(private readonly pool: Pool) {}

  async save(event: OrderStatusAudit): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO order_status (order_id, driver_id, status, route_name, duration_ms, occurred_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())
         ON CONFLICT (order_id) DO UPDATE SET
           driver_id = EXCLUDED.driver_id,
           status = EXCLUDED.status,
           route_name = EXCLUDED.route_name,
           duration_ms = EXCLUDED.duration_ms,
           occurred_at = EXCLUDED.occurred_at,
           updated_at = now()`,
        [event.orderId, event.driverId, event.status, event.routeName ?? null, event.durationMs ?? null, event.occurredAt],
      );
      await client.query(
        `INSERT INTO outbox_event (aggregate_type, aggregate_id, event_type, payload)
         VALUES ($1, $2, $3, $4)`,
        ['order_status', event.orderId, 'OrderStatusUpdated', JSON.stringify(event)],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
