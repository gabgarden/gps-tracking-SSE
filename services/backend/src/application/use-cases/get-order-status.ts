import type { OrderStatusAudit } from '@gps-tracking/shared/audit';
import type { OrderStatusRepository } from '../ports/order-status-repository.js';
import type { Cache } from '../ports/cache.js';
import { orderStatusCacheKey } from './update-order-status.js';

const ORDER_STATUS_CACHE_TTL_SECONDS = 30;

/** Read-through: serves the cached status when present, otherwise falls back to Postgres and repopulates the cache. */
export class GetOrderStatus {
  constructor(
    private readonly orderStatusRepository: OrderStatusRepository,
    private readonly cache: Cache,
  ) {}

  async execute(orderId: string): Promise<OrderStatusAudit | null> {
    const cached = await this.cache.get<OrderStatusAudit>(orderStatusCacheKey(orderId));
    if (cached) return cached;

    const stored = await this.orderStatusRepository.findById(orderId);
    if (stored) {
      await this.cache.set(orderStatusCacheKey(orderId), stored, ORDER_STATUS_CACHE_TTL_SECONDS);
    }
    return stored;
  }
}
