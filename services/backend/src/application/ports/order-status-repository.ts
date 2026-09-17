import type { OrderStatusAudit } from '@gps-tracking/shared/audit';

/**
 * Persists the current order status. Implementations must also enqueue an outbox event
 * in the same transaction as the status write, so persistence and event publication
 * never diverge (Outbox pattern) — replacing a direct, unsafe dual write.
 */
export interface OrderStatusRepository {
  save(event: OrderStatusAudit): Promise<void>;
}
