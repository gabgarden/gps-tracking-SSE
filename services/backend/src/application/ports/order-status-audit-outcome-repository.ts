export type AuditOutcome = 'confirmed' | 'failed';

/** Applies the saga's confirmation/compensation outcome, once per eventId (idempotent). */
export interface OrderStatusAuditOutcomeRepository {
  applyOutcome(orderId: string, outcome: AuditOutcome, eventId: string): Promise<void>;
}
