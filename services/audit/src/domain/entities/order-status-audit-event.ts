import type { OrderStatus, OrderStatusAudit } from '@gps-tracking/shared/audit';

export type { OrderStatus, OrderStatusAudit };

/** Domain representation of a recorded order-status audit event. */
export class OrderStatusAuditEvent {
  private constructor(private readonly props: OrderStatusAudit) {}

  static create(input: OrderStatusAudit): OrderStatusAuditEvent {
    if (!input.orderId.trim() || !input.driverId.trim() || !input.occurredAt.trim()) {
      throw new Error('Invalid audit event: missing required fields');
    }

    if (input.status !== 'ARRIVED_AT_LOCATION' && input.status !== 'DELIVERED') {
      throw new Error('Invalid audit event: unknown status');
    }

    if (input.durationMs !== undefined && (!Number.isFinite(input.durationMs) || input.durationMs < 0)) {
      throw new Error('Invalid audit event: durationMs must be a non-negative finite number');
    }

    return new OrderStatusAuditEvent({
      orderId: input.orderId.trim(),
      driverId: input.driverId.trim(),
      status: input.status,
      occurredAt: input.occurredAt.trim(),
      routeName: input.routeName,
      durationMs: input.durationMs,
    });
  }

  isDelivery(): boolean {
    return this.props.status === 'DELIVERED';
  }

  toDTO(): OrderStatusAudit {
    return this.props;
  }
}

export function isDeliveryEvent(event: OrderStatusAudit): boolean {
  return event.status === 'DELIVERED';
}
