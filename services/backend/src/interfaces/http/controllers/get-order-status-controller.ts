import type { Request, Response } from 'express';
import type { GetOrderStatus } from '../../../application/use-cases/get-order-status.js';

export class GetOrderStatusController {
  constructor(private readonly getOrderStatus: GetOrderStatus) {}

  async handle(request: Request, response: Response): Promise<void> {
    const { orderId } = request.params;
    if (typeof orderId !== 'string' || !orderId.trim()) {
      response.status(400).json({ error: 'orderId é obrigatório.' });
      return;
    }

    const status = await this.getOrderStatus.execute(orderId);
    if (!status) {
      response.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }

    response.status(200).json(status);
  }
}
