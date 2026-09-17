export type OrderStatus = 'ARRIVED_AT_LOCATION' | 'DELIVERED';

export interface OrderStatusAudit {
  readonly orderId: string;
  readonly driverId: string;
  readonly status: OrderStatus;
  readonly occurredAt: string;
  /** Nome da rota percorrida (opcional, enviado pelo simulador). */
  readonly routeName?: string;
  /** Tempo total da rota em milissegundos (opcional, enviado pelo simulador). */
  readonly durationMs?: number;
}

/** Saga compensation payload: published when the audit service could not durably record an order status event. */
export interface OrderStatusAuditFailure {
  readonly orderId: string;
  readonly driverId: string;
  readonly reason: string;
}

/** Saga compensation payload: published when the audit service could not durably record an order status event. */
export interface OrderStatusAuditFailure {
  readonly orderId: string;
  readonly driverId: string;
  readonly reason: string;
}
