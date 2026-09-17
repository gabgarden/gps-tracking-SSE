export const AUDIT_ORDER_STATUS_QUEUE = 'audit.order-status';
/** Published by the audit service, via its outbox, once an order-status event has been durably recorded. */
export const AUDIT_ORDER_STATUS_AUDITED_QUEUE = 'audit.order-status-audited';
