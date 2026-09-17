import type { OrderStatusRepository } from '../ports/order-status-repository.js';
import {
  createOrderStatusChange,
  type OrderStatusChangeInput,
} from '../../domain/entities/order-status-change.js';

export class UpdateOrderStatus {
  constructor(private readonly orderStatusRepository: OrderStatusRepository) {}

  async execute(input: OrderStatusChangeInput): Promise<void> {
    const event = createOrderStatusChange(input, new Date());
    await this.orderStatusRepository.save(event);
  }
}
