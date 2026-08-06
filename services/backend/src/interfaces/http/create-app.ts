import cors from 'cors';
import express from 'express';
import { StreamCarMovementsController } from './controllers/stream-car-movement-controller.js';
import { TelemetryController } from './controllers/telemetry-controller.js';
import { OrderStatusController } from './controllers/order-status-controller.js';

export function createApp(
  streamCarMovementsController: StreamCarMovementsController,
  telemetryController: TelemetryController,
  orderStatusController: OrderStatusController,
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

  return app;
}
