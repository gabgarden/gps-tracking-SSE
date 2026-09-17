import { connect, type Channel, type ChannelModel } from 'amqplib';
import { AUDIT_ORDER_STATUS_QUEUE, type OutboxEnvelope } from '@gps-tracking/shared/audit';
import type { OutboxEventRecord, OutboxPublisher } from '../../application/ports/outbox-publisher.js';

/** Publishes outbox events to the AUDIT_ORDER_STATUS_QUEUE, reconnecting lazily on failure. */
export class AmqpOutboxPublisher implements OutboxPublisher {
  private connection?: ChannelModel;
  private channel?: Channel;
  private channelPromise?: Promise<Channel>;

  constructor(private readonly amqpUrl: string) {}

  async publish(event: OutboxEventRecord): Promise<void> {
    const channel = await this.getChannel();
    const envelope: OutboxEnvelope<unknown> = {
      eventId: `backend:${event.aggregateType}:${event.id}`,
      eventType: event.eventType,
      payload: event.payload,
    };
    channel.sendToQueue(AUDIT_ORDER_STATUS_QUEUE, Buffer.from(JSON.stringify(envelope)), {
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
      channel.on('error', (error) => console.error('AMQP outbox channel error', error));
      this.channel = channel;
      return channel;
    });

    return this.channelPromise;
  }

  private async getConnection(): Promise<ChannelModel> {
    if (this.connection) return this.connection;

    this.connection = await connect(this.amqpUrl);
    this.connection.on('close', () => {
      this.connection = undefined;
      this.channel = undefined;
      this.channelPromise = undefined;
    });
    this.connection.on('error', (error) => console.error('AMQP outbox connection error', error));
    return this.connection;
  }
}
