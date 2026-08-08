import { connect, type Channel, type ConsumeMessage } from 'amqplib';
import { AUDIT_ORDER_STATUS_QUEUE } from '@gps-tracking/shared/audit';
import type { OrderStatusAudit } from '../../domain/entities/order-status-audit-event.js';
import type { RecordOrderStatusAudit } from '../../application/use-cases/record-order-status-audit.js';

export class AmqpOrderStatusConsumer {
  constructor(
    private readonly amqpUrl: string,
    private readonly recordOrderStatusAudit: RecordOrderStatusAudit,
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

    try {
      const event = JSON.parse(message.content.toString()) as OrderStatusAudit;
      await this.recordOrderStatusAudit.execute(event);
      channel.ack(message);
    } catch (error) {
      console.error('Invalid audit event', error);
      channel.nack(message, false, false);
    }
  }
}
