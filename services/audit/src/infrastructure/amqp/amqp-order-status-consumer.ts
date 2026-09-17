import { connect, type Channel, type ConsumeMessage } from 'amqplib';
import { AUDIT_ORDER_STATUS_QUEUE, type OutboxEnvelope } from '@gps-tracking/shared/audit';
import type { OrderStatusAudit } from '../../domain/entities/order-status-audit-event.js';
import type { RecordOrderStatusAudit } from '../../application/use-cases/record-order-status-audit.js';
import type { RecordOrderStatusAuditFailure } from '../../application/use-cases/record-order-status-audit-failure.js';

export class AmqpOrderStatusConsumer {
  constructor(
    private readonly amqpUrl: string,
    private readonly recordOrderStatusAudit: RecordOrderStatusAudit,
    private readonly recordOrderStatusAuditFailure: RecordOrderStatusAuditFailure,
  ) {}

  async start(): Promise<void> {
    const connection = await connect(this.amqpUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(AUDIT_ORDER_STATUS_QUEUE, { durable: true });

    await channel.consume(AUDIT_ORDER_STATUS_QUEUE, (message) => {
      void this.handleMessage(channel, message);
    });

    console.info(`Audit service consuming ${AUDIT_ORDER_STATUS_QUEUE}`);
  }

  private async handleMessage(channel: Channel, message: ConsumeMessage | null): Promise<void> {
    if (!message) return;

    let envelope: OutboxEnvelope<OrderStatusAudit>;
    try {
      envelope = JSON.parse(message.content.toString()) as OutboxEnvelope<OrderStatusAudit>;
    } catch (error) {
      console.error('Malformed audit event, dropping message', error);
      channel.nack(message, false, false);
      return;
    }

    try {
      await this.recordOrderStatusAudit.execute(envelope.payload, envelope.eventId);
      channel.ack(message);
    } catch (error) {
      console.error('Invalid audit event, compensating', error);
      await this.compensate(channel, message, envelope, error);
    }
  }

  private async compensate(
    channel: Channel,
    message: ConsumeMessage,
    envelope: OutboxEnvelope<OrderStatusAudit>,
    error: unknown,
  ): Promise<void> {
    try {
      await this.recordOrderStatusAuditFailure.execute(
        {
          orderId: envelope.payload?.orderId ?? 'unknown',
          driverId: envelope.payload?.driverId ?? 'unknown',
          reason: error instanceof Error ? error.message : 'Unknown audit failure',
        },
        `${envelope.eventId}:failed`,
      );
      channel.ack(message);
    } catch (compensationError) {
      console.error('Failed to enqueue audit compensation event', compensationError);
      channel.nack(message, false, false);
    }
  }
}
