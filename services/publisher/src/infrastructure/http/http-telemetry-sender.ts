import type { TelemetryPayload } from '../../domain/entities/telemetry-payload.js';
import type { TelemetrySender } from '../../application/ports/telemetry-sender.js';

/** Sends telemetry payloads to the backend HTTP API. */
export class HttpTelemetrySender implements TelemetrySender {
  constructor(private readonly telemetryUrl: string) {}

  async send(payload: TelemetryPayload): Promise<void> {
    const response = await fetch(this.telemetryUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  }
}
