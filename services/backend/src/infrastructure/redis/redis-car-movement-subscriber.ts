import { createClient, type RedisClientType } from 'redis';
import type { CarMovementMessage } from '../../application/dto/car-movement-message.js';
import type {
  CarMovementSubscriber,
  CarMovementSubscription,
} from '../../application/ports/car-movement-subscriber.js';

const CAR_MOVEMENTS_CHANNEL = process.env.CAR_MOVEMENTS_CHANNEL ?? 'car-movements';

export class RedisCarMovementSubscriber implements CarMovementSubscriber {
  constructor(private readonly client: RedisClientType) {}

  async subscribe(onMovement: (movement: CarMovementMessage) => void): Promise<CarMovementSubscription> {
    const subscriber = this.client.duplicate();
    subscriber.on('error', (error) => console.error('Redis subscriber error', error));
    await subscriber.connect();

    await subscriber.subscribe(CAR_MOVEMENTS_CHANNEL, (payload) => onMovement({ payload }));

    return {
      async close() {
        if (!subscriber.isOpen) return;

        await subscriber.unsubscribe(CAR_MOVEMENTS_CHANNEL);
        await subscriber.disconnect();
      },
    };
  }
}

export function createRedisClient(redisUrl: string): RedisClientType {
  const client = createClient({ url: redisUrl });
  client.on('error', (error) => console.error('Redis client error', error));
  return client;
}
