import type { OrderStatusRepository } from '../ports/order-status-repository.js';
import type { Cache } from '../ports/cache.js';
import {
  createOrderStatusChange,
  type OrderStatusChangeInput,
} from '../../domain/entities/order-status-change.js';

const ORDER_STATUS_CACHE_TTL_SECONDS = 30;

export function orderStatusCacheKey(orderId: string): string {
  return `order_status:${orderId}`;
}

export class UpdateOrderStatus {
  constructor(
    private readonly orderStatusRepository: OrderStatusRepository,
    private readonly cache: Cache,
  ) {}

  async execute(input: OrderStatusChangeInput): Promise<void> {
    const event = createOrderStatusChange(input, new Date());
    await this.orderStatusRepository.save(event);
    await this.cache.set(orderStatusCacheKey(event.orderId), event, ORDER_STATUS_CACHE_TTL_SECONDS);
  }
}
