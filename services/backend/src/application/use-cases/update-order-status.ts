import type { AuditService, OrderStatus } from '../ports/audit-service.js';

export class UpdateOrderStatus {
  constructor(private readonly auditService: AuditService) {}

  async execute(input: { orderId: string; driverId: string; status: OrderStatus }): Promise<void> {
    await this.auditService.logOrderStatus({ ...input, occurredAt: new Date().toISOString() });
  }
}
