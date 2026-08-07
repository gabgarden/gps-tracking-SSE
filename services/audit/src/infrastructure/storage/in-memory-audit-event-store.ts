import type { OrderStatusAudit } from '../../domain/entities/order-status-audit.js';
import type { AuditEventListener, AuditEventStore } from '../../application/ports/audit-event-store.js';

/** Keeps audit events in memory for demo/read API purposes. */
export class InMemoryAuditEventStore implements AuditEventStore {
  private readonly events: OrderStatusAudit[] = [];
  private readonly listeners = new Set<AuditEventListener>();

  append(event: OrderStatusAudit): void {
    this.events.push(event);
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  list(): readonly OrderStatusAudit[] {
    return [...this.events];
  }

  subscribe(listener: AuditEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
