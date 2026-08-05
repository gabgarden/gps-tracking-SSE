import cors from 'cors';
import express from 'express';
import path from 'node:path';
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
  // The dashboard must be delivered by the same origin as SSE. This avoids
  // opening the HTML as a file and makes the project work via localhost:8080.
  app.use(express.static(path.resolve(process.cwd(), 'src/static')));

  app.get('/stream', (req, res) => streamCarMovementsController.handle(req, res));
  app.post('/telemetry', (req, res) => void telemetryController.handle(req, res));
  app.post('/orders/:orderId/status', (req, res) => void orderStatusController.handle(req, res));

  return app;
}
