export interface OutboxWriteInput {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: unknown;
}

/** Idempotently enqueues an outbox event keyed by eventId; a repeat eventId is a no-op. */
export interface OutboxWriter {
  enqueueIfNew(eventId: string, input: OutboxWriteInput): Promise<void>;
}
