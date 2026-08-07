import type { OrderStatus } from '@gps-tracking/shared/audit';

const STATUS_ALIASES: Readonly<Record<string, OrderStatus>> = {
  ARRIVED_AT_LOCATION: 'ARRIVED_AT_LOCATION',
  CHEGOU_NO_LOCAL: 'ARRIVED_AT_LOCATION',
  DELIVERED: 'DELIVERED',
  ENTREGUE: 'DELIVERED',
};

/** Maps a raw status string (canonical or localized alias) to a domain OrderStatus. */
export function parseOrderStatus(raw: string): OrderStatus | undefined {
  return STATUS_ALIASES[raw];
}
