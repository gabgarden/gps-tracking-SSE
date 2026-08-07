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
