export type OrderStatus = 'ARRIVED_AT_LOCATION' | 'DELIVERED';

export interface OrderStatusAudit {
  readonly orderId: string;
  readonly driverId: string;
  readonly status: OrderStatus;
  readonly occurredAt: string;
}

/**
 * Internal communication contract. Its adapter can use AMQP or gRPC without
 * leaking a transport concern into the order use case.
 */
export interface AuditService {
  logOrderStatus(event: OrderStatusAudit): Promise<void>;
}
