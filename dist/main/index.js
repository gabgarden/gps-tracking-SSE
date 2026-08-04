"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_car_movements_js_1 = require("../application/use-cases/stream-car-movements.js");
const redis_car_movement_subscriber_js_1 = require("../infrastructure/redis/redis-car-movement-subscriber.js");
const create_app_js_1 = require("../presentation/http/create-app.js");
const port = Number(process.env.PORT ?? 8080);
const redisClient = (0, redis_car_movement_subscriber_js_1.createRedisClient)(process.env.REDIS_URL ?? 'redis://redis:6379');
const streamCarMovements = new stream_car_movements_js_1.StreamCarMovements(new redis_car_movement_subscriber_js_1.RedisCarMovementSubscriber(redisClient));
const app = (0, create_app_js_1.createApp)(streamCarMovements);
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
