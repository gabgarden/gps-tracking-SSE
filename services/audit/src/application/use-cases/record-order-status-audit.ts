import type { OrderStatusAudit } from '../../domain/entities/order-status-audit.js';
import type { AuditEventWriter } from '../ports/audit-event-writer.js';

/** Validates and records an order status audit event. */
export class RecordOrderStatusAudit {
  constructor(private readonly writer: AuditEventWriter) {}

  async execute(event: OrderStatusAudit): Promise<void> {
    if (!event.orderId.trim() || !event.driverId.trim() || !event.occurredAt.trim()) {
      throw new Error('Invalid audit event: missing required fields');
    }

    await this.writer.write(event);
  }
}
