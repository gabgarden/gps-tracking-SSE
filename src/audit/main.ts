import { connect } from 'amqplib';
import { AUDIT_ORDER_STATUS_QUEUE } from '../infrastructure/amqp/amqp-audit-service.js';
import type { OrderStatusAudit } from '../application/ports/audit-service.js';

const amqpUrl = process.env.AUDIT_AMQP_URL ?? 'amqp://localhost:5672';

async function bootstrap(): Promise<void> {
  const connection = await connect(amqpUrl);
  const channel = await connection.createChannel();
  await channel.assertQueue(AUDIT_ORDER_STATUS_QUEUE, { durable: true });
  await channel.consume(AUDIT_ORDER_STATUS_QUEUE, (message) => {
    if (!message) return;
    try {
      const event = JSON.parse(message.content.toString()) as OrderStatusAudit;
      // This is the integration boundary: persist/send metrics here as needed.
      console.info('[audit.order-status]', JSON.stringify(event));
      channel.ack(message);
    } catch (error) {
      console.error('Invalid audit event', error);
      channel.nack(message, false, false);
    }
  });
  console.info(`Audit service consuming ${AUDIT_ORDER_STATUS_QUEUE}`);
}

void bootstrap().catch((error) => {
  console.error('Could not start audit service', error);
  process.exitCode = 1;
});
