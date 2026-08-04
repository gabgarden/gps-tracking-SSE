"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCarMovementSubscriber = void 0;
exports.createRedisClient = createRedisClient;
const redis_1 = require("redis");
const NOTIFICATIONS_CHANNEL = 'notifications';
class RedisCarMovementSubscriber {
    client;
    constructor(client) {
        this.client = client;
    }
    async subscribe(onMovement) {
        const subscriber = this.client.duplicate();
        subscriber.on('error', (error) => console.error('Redis subscriber error', error));
        await subscriber.connect();
        await subscriber.subscribe(NOTIFICATIONS_CHANNEL, (payload) => onMovement({ payload }));
        return {
            async close() {
                if (!subscriber.isOpen)
                    return;
                await subscriber.unsubscribe(NOTIFICATIONS_CHANNEL);
                await subscriber.disconnect();
            },
        };
    }
}
exports.RedisCarMovementSubscriber = RedisCarMovementSubscriber;
function createRedisClient(redisUrl) {
    const client = (0, redis_1.createClient)({ url: redisUrl });
    client.on('error', (error) => console.error('Redis client error', error));
    return client;
}
