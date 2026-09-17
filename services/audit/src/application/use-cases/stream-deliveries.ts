import { isDeliveryEvent, type OrderStatusAudit } from '../../domain/entities/order-status-audit-event.js';
import type { AuditEventStore } from '../ports/audit-event-store.js';

export type DeliveryListener = (event: OrderStatusAudit) => void;

/** Streams historical and live delivery audit events. */
export class StreamDeliveries {
  constructor(private readonly store: AuditEventStore) {}

  async execute(onDelivery: DeliveryListener): Promise<() => void> {
    const events = await this.store.list();
    for (const event of events.filter(isDeliveryEvent)) {
      onDelivery(event);
    }

    return this.store.subscribe((event) => {
      if (isDeliveryEvent(event)) {
        onDelivery(event);
      }
    });
  }
}
