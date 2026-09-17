import type { Pool } from 'pg';
import type {
  AuditOutcome,
  OrderStatusAuditOutcomeRepository,
} from '../../application/ports/order-status-audit-outcome-repository.js';
import { claimEventOnce } from './idempotent-outbox.js';

export class PostgresOrderStatusAuditOutcomeRepository implements OrderStatusAuditOutcomeRepository {
  constructor(private readonly pool: Pool) {}

  async applyOutcome(orderId: string, outcome: AuditOutcome, eventId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const isNew = await claimEventOnce(client, eventId);
      if (isNew) {
        await client.query('UPDATE order_status SET audit_status = $1, updated_at = now() WHERE order_id = $2', [
          outcome,
          orderId,
        ]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
