import cors from 'cors';
import express from 'express';
import { StreamCarMovementsController } from './controllers/stream-car-movement-controller.js';
import { TelemetryController } from './controllers/telemetry-controller.js';
import { OrderStatusController } from './controllers/order-status-controller.js';
import { GetOrderStatusController } from './controllers/get-order-status-controller.js';
import { GetCarPositionController } from './controllers/get-car-position-controller.js';

export function createApp(
  streamCarMovementsController: StreamCarMovementsController,
  telemetryController: TelemetryController,
  orderStatusController: OrderStatusController,
  getOrderStatusController: GetOrderStatusController,
  getCarPositionController: GetCarPositionController,
) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });
  app.get('/stream', (request, response) => streamCarMovementsController.handle(request, response));
  app.post('/telemetry', (request, response) => void telemetryController.handle(request, response));
  app.post('/orders/:orderId/status', (request, response) => void orderStatusController.handle(request, response));
  app.get('/orders/:orderId/status', (request, response) => void getOrderStatusController.handle(request, response));
  app.get('/orders/:orderId/position', (request, response) => void getCarPositionController.handle(request, response));

  return app;
}
