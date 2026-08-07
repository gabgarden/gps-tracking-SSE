import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { ListDeliveries } from '../../application/use-cases/list-deliveries.js';
import type { StreamDeliveries } from '../../application/use-cases/stream-deliveries.js';

export function createAuditHttpServer(
  listDeliveries: ListDeliveries,
  streamDeliveries: StreamDeliveries,
  port: number,
): void {
  createServer((request: IncomingMessage, response: ServerResponse) => {
    void handleRequest(request, response, listDeliveries, streamDeliveries);
  }).listen(port, '0.0.0.0', () => {
    console.info(`Audit HTTP API listening on 0.0.0.0:${port}`);
  });
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  listDeliveries: ListDeliveries,
  streamDeliveries: StreamDeliveries,
): Promise<void> {
  const url = request.url?.split('?')[0] ?? '/';

  if (request.method === 'GET' && url === '/health') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (request.method === 'GET' && url === '/audit/deliveries') {
    sendJson(response, 200, listDeliveries.execute());
    return;
  }

  if (request.method === 'GET' && url === '/audit/stream') {
    handleAuditStream(request, response, streamDeliveries);
    return;
  }

  sendJson(response, 404, { error: 'Not found' });
}

function handleAuditStream(
  request: IncomingMessage,
  response: ServerResponse,
  streamDeliveries: StreamDeliveries,
): void {
  response.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  });
  response.flushHeaders?.();

  const unsubscribe = streamDeliveries.execute((delivery) => {
    response.write('event: deliveryRecorded\n');
    response.write(`data: ${JSON.stringify(delivery)}\n\n`);
  });

  const keepAlive = setInterval(() => response.write(': keep-alive\n\n'), 30_000);

  request.on('close', () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}
