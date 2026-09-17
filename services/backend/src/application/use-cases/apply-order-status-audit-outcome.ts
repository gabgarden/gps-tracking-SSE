import type {
  AuditOutcome,
  OrderStatusAuditOutcomeRepository,
} from '../ports/order-status-audit-outcome-repository.js';

/** Consumes the saga's confirmation (OrderStatusAudited) or compensation (OrderStatusAuditFailed) event. */
export class ApplyOrderStatusAuditOutcome {
  constructor(private readonly repository: OrderStatusAuditOutcomeRepository) {}

  async execute(orderId: string, outcome: AuditOutcome, eventId: string): Promise<void> {
    await this.repository.applyOutcome(orderId, outcome, eventId);
  }
}
