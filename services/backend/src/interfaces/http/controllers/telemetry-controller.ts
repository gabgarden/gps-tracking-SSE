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

  return {
    orderId: value.orderId,
    driverId: value.driverId,
    position,
    destination,
  };
}
