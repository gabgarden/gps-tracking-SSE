import { StreamCarMovements } from '../application/use-cases/stream-car-movements.js';
import {
  createRedisClient,
  RedisCarMovementSubscriber,
} from '../infrastructure/redis/redis-car-movement-subscriber.js';
import { createApp } from '../interfaces/http/create-app.js';
import { StreamCarMovementsController } from '../interfaces/http/controllers/stream-car-movement-controller.js';

const port = Number(process.env.PORT ?? 8080);
const redisClient = createRedisClient(process.env.REDIS_URL ?? 'redis://redis:6379');

const streamCarMovements = new StreamCarMovements(
  new RedisCarMovementSubscriber(redisClient),
);

// Instancia o Controller passando o Use Case
const streamCarMovementsController = new StreamCarMovementsController(streamCarMovements);

// Passa o Controller para o createApp
const app = createApp(streamCarMovementsController);

async function bootstrap() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('Conectado ao Redis com sucesso!');
  }

  app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
}

void bootstrap();