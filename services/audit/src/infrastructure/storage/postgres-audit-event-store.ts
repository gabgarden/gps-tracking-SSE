import type { Pool } from 'pg';
import type { OrderStatusAudit } from '../../domain/entities/order-status-audit-event.js';
import type { AuditEventListener, AuditEventStore } from '../../application/ports/audit-event-store.js';
import { claimEventOnce, insertOutboxEvent } from '../db/idempotent-outbox.js';

interface AuditEventRow {
  order_id: string;
  driver_id: string;
  status: string;
  occurred_at: Date;
  route_name: string | null;
  duration_ms: string | null;
}

function toDTO(row: AuditEventRow): OrderStatusAudit {
  return {
    orderId: row.order_id,
    driverId: row.driver_id,
    status: row.status as OrderStatusAudit['status'],
    occurredAt: row.occurred_at.toISOString(),
    routeName: row.route_name ?? undefined,
    durationMs: row.duration_ms !== null ? Number(row.duration_ms) : undefined,
  };
}

/**
 * Persists audit events in Postgres. Each append claims the inbound eventId (Inbox pattern,
 * dedupes at-least-once redeliveries) and writes an outbox_event row in the same transaction
 * (Outbox pattern), so the OutboxRelay can reliably publish an OrderStatusAudited event
 * without a dual write between the DB and the broker.
 */
export class PostgresAuditEventStore implements AuditEventStore {
  private readonly listeners = new Set<AuditEventListener>();

  constructor(private readonly pool: Pool) {}

  async append(event: OrderStatusAudit, eventId: string): Promise<void> {
    const client = await this.pool.connect();
    let isNew: boolean;
    try {
      await client.query('BEGIN');
      isNew = await claimEventOnce(client, eventId);
      if (isNew) {
        await client.query(
          `INSERT INTO audit_event (order_id, driver_id, status, occurred_at, route_name, duration_ms)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [event.orderId, event.driverId, event.status, event.occurredAt, event.routeName ?? null, event.durationMs ?? null],
        );
        await insertOutboxEvent(client, {
          aggregateType: 'order_status_audit',
          aggregateId: event.orderId,
          eventType: 'OrderStatusAudited',
          payload: event,
        });
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (isNew) {
      for (const listener of this.listeners) {
        listener(event);
      }
    }
  }

  async list(): Promise<readonly OrderStatusAudit[]> {
    const { rows } = await this.pool.query<AuditEventRow>(
      'SELECT order_id, driver_id, status, occurred_at, route_name, duration_ms FROM audit_event ORDER BY id ASC',
    );
    return rows.map(toDTO);
  }

  subscribe(listener: AuditEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
