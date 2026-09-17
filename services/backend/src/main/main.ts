import { AUDIT_ORDER_STATUS_AUDITED_QUEUE, AUDIT_ORDER_STATUS_FAILED_QUEUE } from '@gps-tracking/shared/audit';
import { StreamCarMovements } from '../application/use-cases/stream-car-movements.js';
import { ReceiveTelemetry } from '../application/use-cases/receive-telemetry.js';
import { UpdateOrderStatus } from '../application/use-cases/update-order-status.js';
import { ApplyOrderStatusAuditOutcome } from '../application/use-cases/apply-order-status-audit-outcome.js';
import {
  createRedisClient,
  RedisCarMovementSubscriber,
} from '../infrastructure/redis/redis-car-movement-subscriber.js';
import { RedisCarMovementPublisher } from '../infrastructure/redis/redis-car-movement-publisher.js';
import { createPool } from '../infrastructure/db/pool.js';
import { runMigrations } from '../infrastructure/db/migrate.js';
import { PostgresOrderStatusRepository } from '../infrastructure/db/postgres-order-status-repository.js';
import { PostgresOrderStatusAuditOutcomeRepository } from '../infrastructure/db/postgres-order-status-audit-outcome-repository.js';
import { OutboxRelay } from '../infrastructure/outbox/outbox-relay.js';
import { AmqpOutboxPublisher } from '../infrastructure/amqp/amqp-outbox-publisher.js';
import { AmqpOrderStatusOutcomeConsumer } from '../infrastructure/amqp/amqp-order-status-outcome-consumer.js';
import { createApp } from '../interfaces/http/create-app.js';
import { StreamCarMovementsController } from '../interfaces/http/controllers/stream-car-movement-controller.js';
import { TelemetryController } from '../interfaces/http/controllers/telemetry-controller.js';
import { OrderStatusController } from '../interfaces/http/controllers/order-status-controller.js';

const port = Number(process.env.PORT ?? 8080);
const amqpUrl = process.env.AUDIT_AMQP_URL ?? 'amqp://rabbitmq:5672';
const databaseUrl = process.env.BACKEND_DATABASE_URL ?? 'postgres://gps:gps@localhost:5432/gps_backend';
const maxConnectAttempts = Number(process.env.AUDIT_AMQP_CONNECT_ATTEMPTS ?? 15);
const connectRetryMs = Number(process.env.AUDIT_AMQP_CONNECT_RETRY_MS ?? 2000);
const redisClient = createRedisClient(process.env.REDIS_URL ?? 'redis://redis:6379');
const pool = createPool(databaseUrl);

const streamCarMovements = new StreamCarMovements(
  new RedisCarMovementSubscriber(redisClient),
);

const streamCarMovementsController = new StreamCarMovementsController(streamCarMovements);
const telemetryController = new TelemetryController(new ReceiveTelemetry(new RedisCarMovementPublisher(redisClient)));
const orderStatusController = new OrderStatusController(
  new UpdateOrderStatus(new PostgresOrderStatusRepository(pool)),
);

const app = createApp(streamCarMovementsController, telemetryController, orderStatusController);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startConsumerWithRetry(consumer: AmqpOrderStatusOutcomeConsumer): Promise<void> {
  for (let attempt = 1; attempt <= maxConnectAttempts; attempt++) {
    try {
      await consumer.start();
      return;
    } catch (error) {
      console.error(`Backend AMQP connect attempt ${attempt}/${maxConnectAttempts} failed`, error);
      if (attempt === maxConnectAttempts) throw error;
      await sleep(connectRetryMs);
    }
  }
}

async function bootstrap() {
  await runMigrations(pool);

  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('Conectado ao Redis com sucesso!');
  }

  const outboxRelay = new OutboxRelay(pool, new AmqpOutboxPublisher(amqpUrl));
  outboxRelay.start();

  const applyOrderStatusAuditOutcome = new ApplyOrderStatusAuditOutcome(
    new PostgresOrderStatusAuditOutcomeRepository(pool),
  );
  await startConsumerWithRetry(
    new AmqpOrderStatusOutcomeConsumer(amqpUrl, AUDIT_ORDER_STATUS_AUDITED_QUEUE, 'confirmed', applyOrderStatusAuditOutcome),
  );
  await startConsumerWithRetry(
    new AmqpOrderStatusOutcomeConsumer(amqpUrl, AUDIT_ORDER_STATUS_FAILED_QUEUE, 'failed', applyOrderStatusAuditOutcome),
  );

  app.listen(port, '0.0.0.0', () => {
    console.log(`Backend rodando em http://localhost:${port}`);
  });
}

void bootstrap();
