import { isDeliveryEvent, type OrderStatusAudit } from '../../domain/entities/order-status-audit-event.js';
import type { AuditEventStore } from '../ports/audit-event-store.js';

/** Lists recorded delivery (DELIVERED) audit events, newest first. */
export class ListDeliveries {
  constructor(private readonly store: AuditEventStore) {}

  async execute(): Promise<readonly OrderStatusAudit[]> {
    const events = await this.store.list();
    return events.filter(isDeliveryEvent).slice().reverse();
  }
}
