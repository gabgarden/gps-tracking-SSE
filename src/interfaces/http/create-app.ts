import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { StreamCarMovementsController } from './controllers/stream-car-movements.controller.ts';

export function createApp(streamCarMovementsController: StreamCarMovementsController) {
  const app = express();
  app.use(cors());

  app.get('/stream', (req, res) => streamCarMovementsController.handle(req, res));

  return app;
}