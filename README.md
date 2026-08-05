# Rastreamento de entregas

## Telemetria

`POST /telemetry` recebe a posição real do motorista e o destino do pedido:

```json
{
  "orderId": "order-42",
  "driverId": "driver-7",
  "lat": -21.7545,
  "lng": -41.3245,
  "destinationLat": -21.7681,
  "destinationLng": -41.3392
}
```

O caso de uso `ReceiveTelemetry` calcula a distância restante em quilômetros
com a fórmula de Haversine e publica no canal Redis `car-movements`. O evento
enviado por SSE contém `remainingDistanceKm`.

## Auditoria

O contrato interno é `AuditService.logOrderStatus`. A alteração de status é
disparada por `POST /orders/:orderId/status` com `driverId` e um dos status:
`ARRIVED_AT_LOCATION` ou `DELIVERED` (os aliases `CHEGOU_NO_LOCAL` e
`ENTREGUE` também são aceitos).

`AmqpAuditService` publica eventos duráveis na fila AMQP `audit.order-status`.
O microsserviço isolado em `src/audit/main.ts` consome a fila e é iniciado pelo
serviço `audit` do Docker Compose. A regra de negócio permanece dependente
somente de `AuditService`.
