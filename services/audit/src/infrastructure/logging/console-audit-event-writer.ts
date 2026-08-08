import type { AuditEventWriter } from '../../application/ports/audit-event-writer.js';
import type { OrderStatusAudit } from '../../domain/entities/order-status-audit-event.js';

/** Logs audit events to stdout. Replace with DB/metrics in production. */
export class ConsoleAuditEventWriter implements AuditEventWriter {
  async write(event: OrderStatusAudit): Promise<void> {
    console.info('[audit.order-status]', JSON.stringify(event));
  }
}
