import type { OrderStatus, OrderStatusAudit } from '@gps-tracking/shared/audit';

export type { OrderStatus, OrderStatusAudit };

/**
 * Internal communication contract. Its adapter can use AMQP or gRPC without
 * leaking a transport concern into the order use case.
 */
export interface AuditService {
  logOrderStatus(event: OrderStatusAudit): Promise<void>;
}
