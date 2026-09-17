import type { PoolClient } from 'pg';

/**
 * Claims an inbound eventId exactly once (Inbox pattern), used to dedupe at-least-once
 * AMQP deliveries. Must run inside the same transaction as the resulting state change.
 */
export async function claimEventOnce(client: PoolClient, eventId: string): Promise<boolean> {
  const result = await client.query('INSERT INTO processed_event (event_id) VALUES ($1) ON CONFLICT DO NOTHING', [
    eventId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export interface OutboxEventInput {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: unknown;
}

export async function insertOutboxEvent(client: PoolClient, input: OutboxEventInput): Promise<void> {
  await client.query(
    `INSERT INTO outbox_event (aggregate_type, aggregate_id, event_type, payload) VALUES ($1, $2, $3, $4)`,
    [input.aggregateType, input.aggregateId, input.eventType, JSON.stringify(input.payload)],
  );
}
