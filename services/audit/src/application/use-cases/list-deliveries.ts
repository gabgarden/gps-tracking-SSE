import { isDeliveryEvent, type OrderStatusAudit } from '../../domain/entities/order-status-audit-event.js';
import type { AuditEventStore } from '../ports/audit-event-store.js';

/** Lists recorded delivery (DELIVERED) audit events, newest first. */
export class ListDeliveries {
  constructor(private readonly store: AuditEventStore) {}

  execute(): readonly OrderStatusAudit[] {
    return this.store
      .list()
      .filter(isDeliveryEvent)
      .slice()
      .reverse();
  }
}
