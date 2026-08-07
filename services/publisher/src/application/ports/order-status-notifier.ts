export interface OrderStatusNotification {
  readonly orderId: string;
  readonly driverId: string;
  readonly status: 'DELIVERED';
  readonly routeName: string;
  readonly durationMs: number;
}

export interface OrderStatusNotifier {
  notify(notification: OrderStatusNotification): Promise<void>;
}
