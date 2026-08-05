import { StreamCarMovements } from '../application/use-cases/stream-car-movements.js';
import { ReceiveTelemetry } from '../application/use-cases/receive-telemetry.js';
import { UpdateOrderStatus } from '../application/use-cases/update-order-status.js';
import {
  createRedisClient,
  RedisCarMovementSubscriber,
} from '../infrastructure/redis/redis-car-movement-subscriber.js';
import { RedisCarMovementPublisher } from '../infrastructure/redis/redis-car-movement-publisher.js';
import { AmqpAuditService } from '../infrastructure/amqp/amqp-audit-service.js';
import { createApp } from '../interfaces/http/create-app.js';
import { StreamCarMovementsController } from '../interfaces/http/controllers/stream-car-movement-controller.js';
import { TelemetryController } from '../interfaces/http/controllers/telemetry-controller.js';
import { OrderStatusController } from '../interfaces/http/controllers/order-status-controller.js';

const port = Number(process.env.PORT ?? 8080);
const redisClient = createRedisClient(process.env.REDIS_URL ?? 'redis://redis:6379');

const streamCarMovements = new StreamCarMovements(
  new RedisCarMovementSubscriber(redisClient),
);

// Instancia o Controller passando o Use Case
const streamCarMovementsController = new StreamCarMovementsController(streamCarMovements);
const telemetryController = new TelemetryController(new ReceiveTelemetry(new RedisCarMovementPublisher(redisClient)));
const orderStatusController = new OrderStatusController(
  new UpdateOrderStatus(new AmqpAuditService(process.env.AUDIT_AMQP_URL ?? 'amqp://rabbitmq:5672')),
);

// Passa o Controller para o createApp
const app = createApp(streamCarMovementsController, telemetryController, orderStatusController);

async function bootstrap() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('Conectado ao Redis com sucesso!');
  }

  app.listen(port,'0.0.0.0',  () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
}

void bootstrap();
