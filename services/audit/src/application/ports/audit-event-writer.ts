import type { OrderStatusAudit } from '../../domain/entities/order-status-audit-event.js';

/** Output port for persisting or forwarding validated audit events. */
export interface AuditEventWriter {
  write(event: OrderStatusAudit): Promise<void>;
}
