import type { TelemetryPayload } from '../dto/telemetry-payload.js';

/** Output port for sending telemetry to the backend API. */
export interface TelemetrySender {
  send(payload: TelemetryPayload): Promise<void>;
}
