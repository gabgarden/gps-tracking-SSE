import { StreamCarMovements } from '../application/use-cases/stream-car-movements.js';
import { ReceiveTelemetry } from '../application/use-cases/receive-telemetry.js';
import { UpdateOrderStatus } from '../application/use-cases/update-order-status.js';
import {
  createRedisClient,
  RedisCarMovementSubscriber,
} from '../infrastructure/redis/redis-car-movement-subscriber.js';
import { RedisCarMovementPublisher } from '../infrastructure/redis/redis-car-movement-publisher.js';
import { createPool } from '../infrastructure/db/pool.js';
import { runMigrations } from '../infrastructure/db/migrate.js';
import { PostgresOrderStatusRepository } from '../infrastructure/db/postgres-order-status-repository.js';
import { OutboxRelay } from '../infrastructure/outbox/outbox-relay.js';
import { AmqpOutboxPublisher } from '../infrastructure/amqp/amqp-outbox-publisher.js';
import { createApp } from '../interfaces/http/create-app.js';
import { StreamCarMovementsController } from '../interfaces/http/controllers/stream-car-movement-controller.js';
import { TelemetryController } from '../interfaces/http/controllers/telemetry-controller.js';
import { OrderStatusController } from '../interfaces/http/controllers/order-status-controller.js';

const port = Number(process.env.PORT ?? 8080);
const amqpUrl = process.env.AUDIT_AMQP_URL ?? 'amqp://rabbitmq:5672';
const databaseUrl = process.env.BACKEND_DATABASE_URL ?? 'postgres://gps:gps@localhost:5432/gps_backend';
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

async function bootstrap() {
  await runMigrations(pool);

  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('Conectado ao Redis com sucesso!');
  }

  const outboxRelay = new OutboxRelay(pool, new AmqpOutboxPublisher(amqpUrl));
  outboxRelay.start();

  app.listen(port, '0.0.0.0', () => {
    console.log(`Backend rodando em http://localhost:${port}`);
  });
}

void bootstrap();
