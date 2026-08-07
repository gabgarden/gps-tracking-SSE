/** Transport-level message for a car position change (Redis/SSE payload). */
export interface CarMovementMessage {
  readonly payload: string;
}
