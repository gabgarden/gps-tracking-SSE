import { createClient, type RedisClientType } from 'redis';
import type {
  CarMovementSubscriber,
  CarMovementSubscription,
} from '../../application/ports/car-movement-subscriber.js';

const NOTIFICATIONS_CHANNEL = 'notifications';

export class RedisCarMovementSubscriber implements CarMovementSubscriber {
  constructor(private readonly client: RedisClientType) {}

  async subscribe(onMovement: (movement: { payload: string }) => void): Promise<CarMovementSubscription> {
    const subscriber = this.client.duplicate();
    subscriber.on('error', (error) => console.error('Redis subscriber error', error));
    await subscriber.connect();

    await subscriber.subscribe(NOTIFICATIONS_CHANNEL, (payload) => onMovement({ payload }));

    return {
      async close() {
        if (!subscriber.isOpen) return;

        await subscriber.unsubscribe(NOTIFICATIONS_CHANNEL);
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
