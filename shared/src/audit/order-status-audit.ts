export type OrderStatus = 'ARRIVED_AT_LOCATION' | 'DELIVERED';

export interface OrderStatusAudit {
  readonly orderId: string;
  readonly driverId: string;
  readonly status: OrderStatus;
  readonly occurredAt: string;
}
