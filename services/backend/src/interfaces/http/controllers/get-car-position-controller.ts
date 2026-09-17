import type { Request, Response } from 'express';
import type { GetCarPosition } from '../../../application/use-cases/get-car-position.js';

export class GetCarPositionController {
  constructor(private readonly getCarPosition: GetCarPosition) {}

  async handle(request: Request, response: Response): Promise<void> {
    const { orderId } = request.params;
    if (typeof orderId !== 'string' || !orderId.trim()) {
      response.status(400).json({ error: 'orderId é obrigatório.' });
      return;
    }

    const position = await this.getCarPosition.execute(orderId);
    if (!position) {
      response.status(404).json({ error: 'Nenhuma posição conhecida para este pedido.' });
      return;
    }

    response.status(200).json(position);
  }
}
