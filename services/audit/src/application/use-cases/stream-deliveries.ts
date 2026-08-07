import { isDeliveryEvent, type OrderStatusAudit } from '../../domain/entities/order-status-audit-event.js';
import type { AuditEventStore } from '../ports/audit-event-store.js';

export type DeliveryListener = (event: OrderStatusAudit) => void;

/** Streams historical and live delivery audit events. */
export class StreamDeliveries {
  constructor(private readonly store: AuditEventStore) {}

  execute(onDelivery: DeliveryListener): () => void {
    for (const event of this.store.list().filter(isDeliveryEvent)) {
      onDelivery(event);
    }

    return this.store.subscribe((event) => {
      if (isDeliveryEvent(event)) {
        onDelivery(event);
      }
    });
  }
}
