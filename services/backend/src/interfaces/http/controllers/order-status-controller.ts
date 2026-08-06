import type { Request, Response } from 'express';
import { UpdateOrderStatus } from '../../../application/use-cases/update-order-status.js';
import type { OrderStatus } from '../../../application/ports/audit-service.js';

const STATUS_ALIASES: Readonly<Record<string, OrderStatus>> = {
  ARRIVED_AT_LOCATION: 'ARRIVED_AT_LOCATION',
  CHEGOU_NO_LOCAL: 'ARRIVED_AT_LOCATION',
  DELIVERED: 'DELIVERED',
  ENTREGUE: 'DELIVERED',
};

export class OrderStatusController {
  constructor(private readonly updateOrderStatus: UpdateOrderStatus) {}

  async handle(request: Request, response: Response): Promise<void> {
    const { orderId } = request.params;
    const { driverId, status } = request.body as Record<string, unknown>;
    const normalizedStatus = typeof status === 'string' ? STATUS_ALIASES[status] : undefined;
    if (typeof orderId !== 'string' || !orderId || typeof driverId !== 'string' || !driverId.trim() || !normalizedStatus) {
      response.status(400).json({ error: 'Informe driverId e status (ARRIVED_AT_LOCATION ou DELIVERED).' });
      return;
    }

    await this.updateOrderStatus.execute({ orderId, driverId, status: normalizedStatus });
    response.status(202).json({ orderId, status: normalizedStatus });
  }
}
