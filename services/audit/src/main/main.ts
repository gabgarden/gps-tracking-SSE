import { RecordOrderStatusAudit } from '../application/use-cases/record-order-status-audit.js';
import { ConsoleAuditEventWriter } from '../infrastructure/logging/console-audit-event-writer.js';
import { AmqpOrderStatusConsumer } from '../infrastructure/amqp/amqp-order-status-consumer.js';

const amqpUrl = process.env.AUDIT_AMQP_URL ?? 'amqp://localhost:5672';

async function bootstrap(): Promise<void> {
  const recordOrderStatusAudit = new RecordOrderStatusAudit(new ConsoleAuditEventWriter());
  const consumer = new AmqpOrderStatusConsumer(amqpUrl, recordOrderStatusAudit);
  await consumer.start();
}

void bootstrap().catch((error) => {
  console.error('Could not start audit service', error);
  process.exitCode = 1;
});
