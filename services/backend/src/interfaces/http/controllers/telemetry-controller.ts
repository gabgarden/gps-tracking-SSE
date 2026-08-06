import type { Request, Response } from 'express';
import type { Telemetry } from '../../../domain/entities/telemetry.js';
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
  const fields = ['lat', 'lng', 'destinationLat', 'destinationLng'] as const;
  if (typeof value.orderId !== 'string' || !value.orderId.trim()
    || typeof value.driverId !== 'string' || !value.driverId.trim()
    || fields.some((field) => typeof value[field] !== 'number' || !Number.isFinite(value[field]))) {
    return undefined;
  }

  const { lat, lng, destinationLat, destinationLng } = value as Record<typeof fields[number], number>;
  if (Math.abs(lat) > 90 || Math.abs(destinationLat) > 90 || Math.abs(lng) > 180 || Math.abs(destinationLng) > 180) {
    return undefined;
  }
  return {
    orderId: value.orderId,
    driverId: value.driverId,
    position: { lat, lng },
    destination: { lat: destinationLat, lng: destinationLng },
  };
}
