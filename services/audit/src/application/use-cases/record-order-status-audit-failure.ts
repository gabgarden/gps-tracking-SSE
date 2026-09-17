import type { OrderStatusAuditFailure } from '@gps-tracking/shared/audit';
import type { OutboxWriter } from '../ports/outbox-writer.js';

/** Saga compensation step: enqueues an OrderStatusAuditFailed event when a status event could not be recorded. */
export class RecordOrderStatusAuditFailure {
  constructor(private readonly outboxWriter: OutboxWriter) {}

  async execute(failure: OrderStatusAuditFailure, eventId: string): Promise<void> {
    await this.outboxWriter.enqueueIfNew(eventId, {
      aggregateType: 'order_status_audit',
      aggregateId: failure.orderId,
      eventType: 'OrderStatusAuditFailed',
      payload: failure,
    });
  }
}
