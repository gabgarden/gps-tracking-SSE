/**
 * Wire format used by every outbox relay publish. `eventId` is a globally unique,
 * stable identifier (derived from the producer's own outbox row) so consumers can
 * deduplicate at-least-once AMQP deliveries instead of reprocessing the same event.
 */
export interface OutboxEnvelope<T> {
  readonly eventId: string;
  readonly eventType: string;
  readonly payload: T;
}
