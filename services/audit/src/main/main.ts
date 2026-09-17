import { RecordOrderStatusAudit } from '../application/use-cases/record-order-status-audit.js';
import { ListDeliveries } from '../application/use-cases/list-deliveries.js';
import { StreamDeliveries } from '../application/use-cases/stream-deliveries.js';
import { ConsoleAuditEventWriter } from '../infrastructure/logging/console-audit-event-writer.js';
import { AmqpOrderStatusConsumer } from '../infrastructure/amqp/amqp-order-status-consumer.js';
import { PostgresAuditEventStore } from '../infrastructure/storage/postgres-audit-event-store.js';
import { createPool } from '../infrastructure/db/pool.js';
import { runMigrations } from '../infrastructure/db/migrate.js';
import { createAuditHttpServer } from '../interfaces/http/create-audit-http-server.js';

const amqpUrl = process.env.AUDIT_AMQP_URL ?? 'amqp://localhost:5672';
const httpPort = Number(process.env.AUDIT_HTTP_PORT ?? 8081);
const maxConnectAttempts = Number(process.env.AUDIT_AMQP_CONNECT_ATTEMPTS ?? 15);
const connectRetryMs = Number(process.env.AUDIT_AMQP_CONNECT_RETRY_MS ?? 2000);
const databaseUrl = process.env.AUDIT_DATABASE_URL ?? 'postgres://gps:gps@localhost:5432/gps_audit';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startConsumerWithRetry(consumer: AmqpOrderStatusConsumer): Promise<void> {
  for (let attempt = 1; attempt <= maxConnectAttempts; attempt++) {
    try {
      await consumer.start();
      console.info(`Audit AMQP consumer connected on attempt ${attempt}`);
      return;
    } catch (error) {
      console.error(`Audit AMQP connect attempt ${attempt}/${maxConnectAttempts} failed`, error);
      if (attempt === maxConnectAttempts) throw error;
      await sleep(connectRetryMs);
    }
  }
}

async function bootstrap(): Promise<void> {
  const pool = createPool(databaseUrl);
  await runMigrations(pool);

  const store = new PostgresAuditEventStore(pool);
  const recordOrderStatusAudit = new RecordOrderStatusAudit(new ConsoleAuditEventWriter(), store);
  const listDeliveries = new ListDeliveries(store);
  const streamDeliveries = new StreamDeliveries(store);
  const consumer = new AmqpOrderStatusConsumer(amqpUrl, recordOrderStatusAudit);

  await startConsumerWithRetry(consumer);
  createAuditHttpServer(listDeliveries, streamDeliveries, httpPort);
}

void bootstrap().catch((error) => {
  console.error('Could not start audit service', error);
  process.exit(1);
});
