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
