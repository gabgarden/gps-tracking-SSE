import type { Request, Response } from 'express';
import type { Telemetry } from '../../../domain/entities/telemetry.js';
import { createCoordinates } from '../../../domain/value-objects/coordinates.js';
import { ReceiveTelemetry } from '../../../application/use-cases/receive-telemetry.js';

export class TelemetryController {
  constructor(private readonly receiveTelemetry: ReceiveTelemetry) {}

  async handle(request: Request, response: Response): Promise<void> {
    const telemetry = parseTelemetry(request.body);
    if (!telemetry) {
      response.status(400).json({
        error: 'Payload inválido. Informe orderId, driverId, lat, lng, destinationLat e destinationLng.',
      });
      return;
    }

    const update = await this.receiveTelemetry.execute(telemetry);
    response.status(202).json(update);
  }
}

function parseTelemetry(payload: unknown): Telemetry | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const value = payload as Record<string, unknown>;
  if (typeof value.orderId !== 'string' || !value.orderId.trim()
    || typeof value.driverId !== 'string' || !value.driverId.trim()
    || typeof value.lat !== 'number'
    || typeof value.lng !== 'number'
    || typeof value.destinationLat !== 'number'
    || typeof value.destinationLng !== 'number') {
    return undefined;
  }

  const position = createCoordinates(value.lat, value.lng);
  const destination = createCoordinates(value.destinationLat, value.destinationLng);
  if (!position || !destination) return undefined;

  const routeName = parseRouteName(value.routeName);
  const route = parseRoute(value.route);

  return {
    orderId: value.orderId,
    driverId: value.driverId,
    position,
    destination,
    ...(routeName ? { routeName } : {}),
    ...(route ? { route } : {}),
  };
}

function parseRouteName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const name = value.trim();
  return name || undefined;
}

function parseRoute(value: unknown): Telemetry['route'] {
  if (!Array.isArray(value) || value.length === 0) return undefined;

  const points = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return undefined;
    const point = item as Record<string, unknown>;
    const coordinates = createCoordinates(Number(point.lat), Number(point.lng));
    if (!coordinates) return undefined;
    points.push(coordinates);
  }

  return points;
}
