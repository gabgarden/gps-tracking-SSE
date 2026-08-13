import type { OrderStatusAudit } from '../../domain/entities/order-status-audit-event.js';

export type AuditEventListener = (event: OrderStatusAudit) => void;

/** Persistence port for audit events. Filtering belongs to the domain/application layers. */
export interface AuditEventStore {
  append(event: OrderStatusAudit): void;
  list(): readonly OrderStatusAudit[];
  subscribe(listener: AuditEventListener): () => void;
}
