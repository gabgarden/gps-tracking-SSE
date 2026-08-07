import type { Request, Response } from 'express';
import { UpdateOrderStatus } from '../../../application/use-cases/update-order-status.js';
import { parseOrderStatus } from '../../../domain/value-objects/order-status.js';

export class OrderStatusController {
  constructor(private readonly updateOrderStatus: UpdateOrderStatus) {}

  async handle(request: Request, response: Response): Promise<void> {
    const { orderId } = request.params;
    const { driverId, status, routeName, durationMs } = request.body as Record<string, unknown>;
    const normalizedStatus = typeof status === 'string' ? parseOrderStatus(status) : undefined;
    if (typeof orderId !== 'string' || !orderId || typeof driverId !== 'string' || !driverId.trim() || !normalizedStatus) {
      response.status(400).json({ error: 'Informe driverId e status (ARRIVED_AT_LOCATION ou DELIVERED).' });
      return;
    }

    if (routeName !== undefined && typeof routeName !== 'string') {
      response.status(400).json({ error: 'routeName deve ser uma string.' });
      return;
    }

    if (durationMs !== undefined && (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0)) {
      response.status(400).json({ error: 'durationMs deve ser um número finito não negativo.' });
      return;
    }

    await this.updateOrderStatus.execute({
      orderId,
      driverId,
      status: normalizedStatus,
      routeName: typeof routeName === 'string' ? routeName : undefined,
      durationMs: typeof durationMs === 'number' ? durationMs : undefined,
    });
    response.status(202).json({ orderId, status: normalizedStatus });
  }
}
