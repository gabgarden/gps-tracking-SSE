import type { Pool } from 'pg';
import type { OutboxWriteInput, OutboxWriter } from '../../application/ports/outbox-writer.js';
import { claimEventOnce, insertOutboxEvent } from './idempotent-outbox.js';

export class PostgresOutboxWriter implements OutboxWriter {
  constructor(private readonly pool: Pool) {}

  async enqueueIfNew(eventId: string, input: OutboxWriteInput): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const isNew = await claimEventOnce(client, eventId);
      if (isNew) {
        await insertOutboxEvent(client, input);
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
