export interface OutboxEventRecord {
  readonly id: number;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: unknown;
}

/** Output port used by the OutboxRelay to deliver a pending outbox row to the broker. */
export interface OutboxPublisher {
  publish(event: OutboxEventRecord): Promise<void>;
}
