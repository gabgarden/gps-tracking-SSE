import type { TelemetryUpdate } from '../../domain/entities/telemetry.js';

/**
 * Persists telemetry history for durability (survives Redis pub/sub having no subscriber,
 * process restarts, etc). A single insert is used — not the Outbox pattern — because this
 * write has no downstream consumer that needs a guaranteed derived event: the live SSE path
 * already gets updates directly from Redis pub/sub, independent of this record.
 */
export interface CarMovementHistoryRepository {
  record(update: TelemetryUpdate): Promise<void>;
}
