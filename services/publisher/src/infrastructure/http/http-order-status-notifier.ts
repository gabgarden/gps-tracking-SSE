import type {
  OrderStatusNotification,
  OrderStatusNotifier,
} from '../../application/ports/order-status-notifier.js';

/** Notifies the backend that an order status changed (audit flow). */
export class HttpOrderStatusNotifier implements OrderStatusNotifier {
  constructor(private readonly baseUrl: string) {}

  async notify(notification: OrderStatusNotification): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/orders/${encodeURIComponent(notification.orderId)}/status`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          driverId: notification.driverId,
          status: notification.status,
          routeName: notification.routeName,
          durationMs: notification.durationMs,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  }
}
