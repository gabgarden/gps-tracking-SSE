import { connect, type Channel, type ConsumeMessage } from 'amqplib';
import type { OrderStatusAudit, OrderStatusAuditFailure, OutboxEnvelope } from '@gps-tracking/shared/audit';
import type { AuditOutcome } from '../../application/ports/order-status-audit-outcome-repository.js';
import type { ApplyOrderStatusAuditOutcome } from '../../application/use-cases/apply-order-status-audit-outcome.js';

/** Consumes either the audited or the failed queue and applies the corresponding saga outcome. */
export class AmqpOrderStatusOutcomeConsumer {
  constructor(
    private readonly amqpUrl: string,
    private readonly queue: string,
    private readonly outcome: AuditOutcome,
    private readonly applyOrderStatusAuditOutcome: ApplyOrderStatusAuditOutcome,
  ) {}

  async start(): Promise<void> {
    const connection = await connect(this.amqpUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(this.queue, { durable: true });

    await channel.consume(this.queue, (message) => {
      void this.handleMessage(channel, message);
    });

    console.info(`Backend consuming ${this.queue}`);
  }

  private async handleMessage(channel: Channel, message: ConsumeMessage | null): Promise<void> {
    if (!message) return;

    try {
      const envelope = JSON.parse(message.content.toString()) as OutboxEnvelope<OrderStatusAudit | OrderStatusAuditFailure>;
      await this.applyOrderStatusAuditOutcome.execute(envelope.payload.orderId, this.outcome, envelope.eventId);
      channel.ack(message);
    } catch (error) {
      console.error(`Failed to process message from ${this.queue}`, error);
      channel.nack(message, false, false);
    }
  }
}
