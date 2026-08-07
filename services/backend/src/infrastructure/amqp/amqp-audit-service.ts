import { connect, type Channel, type ChannelModel } from 'amqplib';
import { AUDIT_ORDER_STATUS_QUEUE } from '@gps-tracking/shared/audit';
import type { AuditService, OrderStatusAudit } from '../../application/ports/audit-service.js';

/** AMQP adapter that dispatches status changes to the isolated audit service. */
export class AmqpAuditService implements AuditService {
  private connection?: ChannelModel;
  private channel?: Channel;
  private connectionPromise?: Promise<ChannelModel>;
  private channelPromise?: Promise<Channel>;

  constructor(private readonly amqpUrl: string) {}

  async logOrderStatus(event: OrderStatusAudit): Promise<void> {
    const channel = await this.getChannel();
    channel.sendToQueue(AUDIT_ORDER_STATUS_QUEUE, Buffer.from(JSON.stringify(event)), {
      contentType: 'application/json',
      persistent: true,
    });
  }

  private async getChannel(): Promise<Channel> {
    if (this.channel) return this.channel;

    this.channelPromise ??= this.getConnection().then(async (connection) => {
      const channel = await connection.createChannel();
      await channel.assertQueue(AUDIT_ORDER_STATUS_QUEUE, { durable: true });
      channel.on('close', () => {
        this.channel = undefined;
        this.channelPromise = undefined;
      });
      channel.on('error', (error) => console.error('AMQP audit channel error', error));
      this.channel = channel;
      return channel;
    });

    return this.channelPromise;
  }

  private async getConnection(): Promise<ChannelModel> {
    if (this.connection) return this.connection;

    this.connectionPromise ??= connect(this.amqpUrl).then((connection) => {
      this.connection = connection;
      connection.on('close', () => {
        this.connection = undefined;
        this.connectionPromise = undefined;
        this.channel = undefined;
        this.channelPromise = undefined;
      });
      connection.on('error', (error) => console.error('AMQP audit connection error', error));
      return connection;
    });

    return this.connectionPromise;
  }
}
