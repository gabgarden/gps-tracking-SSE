import { connect, type ChannelModel } from 'amqplib';
import type { AuditService, OrderStatusAudit } from '../../application/ports/audit-service.js';

export const AUDIT_ORDER_STATUS_QUEUE = 'audit.order-status';

/** AMQP adapter that dispatches status changes to the isolated audit service. */
export class AmqpAuditService implements AuditService {
  private connection?: ChannelModel;
  private connectionPromise?: Promise<ChannelModel>;

  constructor(private readonly amqpUrl: string) {}

  async logOrderStatus(event: OrderStatusAudit): Promise<void> {
    const connection = await this.getConnection();
    const channel = await connection.createChannel();
    try {
      await channel.assertQueue(AUDIT_ORDER_STATUS_QUEUE, { durable: true });
      channel.sendToQueue(AUDIT_ORDER_STATUS_QUEUE, Buffer.from(JSON.stringify(event)), {
        contentType: 'application/json',
        persistent: true,
      });
    } finally {
      await channel.close();
    }
  }

  private async getConnection(): Promise<ChannelModel> {
    if (this.connection) return this.connection;
    this.connectionPromise ??= connect(this.amqpUrl).then((connection) => {
      this.connection = connection;
      connection.on('close', () => {
        this.connection = undefined;
        this.connectionPromise = undefined;
      });
      connection.on('error', (error) => console.error('AMQP audit connection error', error));
      return connection;
    });
    return this.connectionPromise;
  }
}
