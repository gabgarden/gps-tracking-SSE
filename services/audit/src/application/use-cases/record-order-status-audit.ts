import { OrderStatusAuditEvent, type OrderStatusAudit } from '../../domain/entities/order-status-audit-event.js';
import type { AuditEventWriter } from '../ports/audit-event-writer.js';
import type { AuditEventStore } from '../ports/audit-event-store.js';

/** Validates and records an order status audit event. */
export class RecordOrderStatusAudit {
  constructor(
    private readonly writer: AuditEventWriter,
    private readonly store: AuditEventStore,
  ) {}

  async execute(input: OrderStatusAudit): Promise<void> {
    const event = OrderStatusAuditEvent.create(input);
    const dto = event.toDTO();

    await this.writer.write(dto);
    this.store.append(dto);
  }
}
