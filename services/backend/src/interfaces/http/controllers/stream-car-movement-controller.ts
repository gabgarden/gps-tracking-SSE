import type { Request, Response } from 'express';
import { StreamCarMovements } from '../../../application/use-cases/stream-car-movements.js';

export class StreamCarMovementsController {
  constructor(private readonly streamCarMovements: StreamCarMovements) {}

  async handle(request: Request, response: Response): Promise<void> {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();

    const subscription = await this.streamCarMovements.execute(({ payload }) => {
      response.write('event: carMoved\n');
      response.write(`data: ${payload}\n\n`);
    });

    const keepAlive = setInterval(() => response.write(': keep-alive\n\n'), 30_000);
    request.on('close', () => {
      clearInterval(keepAlive);
      void subscription.close();
    });
  }
}
