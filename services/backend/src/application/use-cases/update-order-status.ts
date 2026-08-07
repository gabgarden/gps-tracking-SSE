import type { AuditService } from '../ports/audit-service.js';
import {
  createOrderStatusChange,
  type OrderStatusChangeInput,
} from '../../domain/entities/order-status-change.js';

export class UpdateOrderStatus {
  constructor(private readonly auditService: AuditService) {}

  async execute(input: OrderStatusChangeInput): Promise<void> {
    const event = createOrderStatusChange(input, new Date());
    await this.auditService.logOrderStatus(event);
  }
}
