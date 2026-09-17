import type { OrderStatusAudit } from '../../domain/entities/order-status-audit-event.js';

export type AuditEventListener = (event: OrderStatusAudit) => void;

/** Persistence port for audit events. Filtering belongs to the domain/application layers. */
export interface AuditEventStore {
  /** eventId dedupes at-least-once redeliveries; a repeat is a no-op. */
  append(event: OrderStatusAudit, eventId: string): Promise<void>;
  list(): Promise<readonly OrderStatusAudit[]>;
  subscribe(listener: AuditEventListener): () => void;
}
