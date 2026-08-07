import type { OrderStatus, OrderStatusAudit } from '@gps-tracking/shared/audit';

export interface OrderStatusChangeInput {
  readonly orderId: string;
  readonly driverId: string;
  readonly status: OrderStatus;
  readonly routeName?: string;
  readonly durationMs?: number;
}

/** Creates an audit-ready order status change event. */
export function createOrderStatusChange(
  input: OrderStatusChangeInput,
  occurredAt: Date,
): OrderStatusAudit {
  return {
    orderId: input.orderId,
    driverId: input.driverId,
    status: input.status,
    occurredAt: occurredAt.toISOString(),
    routeName: input.routeName,
    durationMs: input.durationMs,
  };
}
