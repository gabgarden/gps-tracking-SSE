import type { Pool } from 'pg';
import type { OutboxEventRecord, OutboxPublisher } from '../../application/ports/outbox-publisher.js';

interface OutboxRow {
  id: number;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: unknown;
  retry_count: number;
}

const MAX_RETRIES = 5;

/**
 * Polls outbox_event for pending rows and publishes each through the OutboxPublisher.
 * Rows are claimed with FOR UPDATE SKIP LOCKED so multiple relay instances can run safely.
 * A row that keeps failing past MAX_RETRIES is marked 'failed' for manual/alerted follow-up
 * instead of retrying forever.
 */
export class OutboxRelay {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly pool: Pool,
    private readonly publisher: OutboxPublisher,
    private readonly pollIntervalMs = 2000,
    private readonly batchSize = 20,
  ) {}

  start(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    const client = await this.pool.connect();
    let rows: OutboxRow[];
    try {
      await client.query('BEGIN');
      const result = await client.query<OutboxRow>(
        `SELECT id, aggregate_type, aggregate_id, event_type, payload, retry_count
         FROM outbox_event
         WHERE status = 'pending'
         ORDER BY created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [this.batchSize],
      );
      rows = result.rows;
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      console.error('Outbox relay failed to claim pending events', error);
      return;
    }
    client.release();

    for (const row of rows) {
      await this.processRow(row);
    }
  }

  private async processRow(row: OutboxRow): Promise<void> {
    const record: OutboxEventRecord = {
      id: row.id,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      eventType: row.event_type,
      payload: row.payload,
    };

    try {
      await this.publisher.publish(record);
      await this.pool.query(`UPDATE outbox_event SET status = 'sent', processed_at = now() WHERE id = $1`, [row.id]);
    } catch (error) {
      console.error(`Outbox relay failed to publish event ${row.id}`, error);
      const nextRetryCount = row.retry_count + 1;
      const nextStatus = nextRetryCount >= MAX_RETRIES ? 'failed' : 'pending';
      await this.pool.query(`UPDATE outbox_event SET retry_count = $1, status = $2 WHERE id = $3`, [
        nextRetryCount,
        nextStatus,
        row.id,
      ]);
    }
  }
}
