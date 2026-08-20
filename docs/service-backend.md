# Serviço backend

Pacote `@gps-tracking/backend`. Pasta `services/backend`.

Documentação: [Backend](service-backend.md) · [Audit](service-audit.md) · [Publisher](service-publisher.md) · [ADR](adr.md) · [Links e comandos](links-e-comandos.md)

## 1. Visão Geral e Responsabilidades

O serviço **Backend** (`services/backend`) atua como a **API Core** e **Hub de Mensageria em Tempo Real** do sistema de rastreamento de entregas. Suas responsabilidades principais incluem:

1. **Ingestão e Validação de Telemetria**: Receber posições geográficas enviadas pelos motoristas/simuladores via requisições HTTP (`POST /telemetry`).
2. **Enriquecimento de Domínio**: Calcular a distância restante em linha reta (`remainingDistanceKm`) entre a posição atual do entregador e o seu destino usando a fórmula matemática de **Haversine**, carimbando a mensagem com o timestamp oficial de recepção.
3. **Publicação em Tempo Real**: Difundir as atualizações de localização instantaneamente através do **Redis Pub/Sub** no canal `car-movements`.
4. **Streaming SSE (Server-Sent Events)**: Manter conexões persistes via `GET /stream` com os clientes frontend, consumindo do Redis Pub/Sub e transmitindo atualizações em tempo real com eventos `carMoved` e *keep-alives* a cada 30 segundos.
5. **Auditoria de Status de Entregas**: Receber atualizações de estado dos pedidos (`POST /orders/:orderId/status`) e despachar mensagens duráveis e persistentes para a fila RabbitMQ (`audit.order-status`) através do protocolo **AMQP**.

---

## 2. Arquitetura e Camadas (Clean Architecture / Ports & Adapters)

O Backend é estruturado seguindo os princípios de **Arquitetura Limpa (Ports and Adapters)**, onde o domínio e a regra de negócio são totalmente isolados dos detalhes de infraestrutura (Redis, RabbitMQ, Express).

```text
+---------------------------------------------------------------------------------------+
|                                    INTERFACES HTTP                                    |
|   [TelemetryController]    [StreamCarMovementsController]    [OrderStatusController]  |
+------------------------------------------+--------------------------------------------+
                                           | (invoca caso de uso)
                                           v
+---------------------------------------------------------------------------------------+
|                                 APPLICATION USE CASES                                 |
|        [ReceiveTelemetry]         [StreamCarMovements]       [UpdateOrderStatus]      |
+------------------------------------------+--------------------------------------------+
                                           | (usa portas e domínio)
                                           v
+---------------------------------------------------------------------------------------+
|                                   APPLICATION PORTS                                   |
|   [CarMovementPublisher]        [CarMovementSubscriber]        [AuditService]         |
+------------------------------------------+--------------------------------------------+
                                           ^
                                           | (implementam as interfaces)
+------------------------------------------+--------------------------------------------+
|                                INFRASTRUCTURE ADAPTERS                                |
| [RedisCarMovementPublisher]   [RedisCarMovementSubscriber]    [AmqpAuditService]      |
+---------------------------------------------------------------------------------------+
|                                    DOMÍNIO PURO                                       |
|  • Coordinates (Haversine distanceKm)  • Telemetry / TelemetryUpdate                    |
|  • OrderStatus (parseOrderStatus)      • OrderStatusAudit                             |
+---------------------------------------------------------------------------------------+
```

---

## 3. Fluxos de Dados e Sequência

### 3.1. Fluxo de Telemetria e Streaming SSE

```text
[Simulador / Motorista]
       |
       | 1. POST /telemetry {orderId, driverId, lat, lng, destinationLat, destinationLng}
       v
[TelemetryController]
       |
       | 2. execute(telemetry)
       v
[ReceiveTelemetry] ---> [Coordinates] (3. calcula Haversine remainingDistanceKm)
       |
       | 4. publish(telemetryUpdate)
       v
[RedisCarMovementPublisher] ---> (PUBLISH no canal Redis 'car-movements')
       |
       v
[Redis Broker (Pub/Sub)]
       |
       v (notifica inscritos)
[RedisCarMovementSubscriber]
       |
       v (callback onMovement)
[StreamCarMovementsController]
       |
       | 5. Transmissão SSE (event: carMoved \n data: {...})
       v
[Frontend Browser (EventSource GET /stream)]
```

### 3.2. Fluxo de Auditoria de Status do Pedido

```text
[Cliente / Simulador]
       |
       | 1. POST /orders/:orderId/status { driverId, status: "DELIVERED", routeName, durationMs }
       v
[OrderStatusController]
       | (parseOrderStatus)
       v
[UpdateOrderStatus]
       |
       | 2. createOrderStatusChange(input, now)
       v
[OrderStatusAudit (Domain Event)]
       |
       | 3. logOrderStatus(event)
       v
[AmqpAuditService]
       |
       | 4. sendToQueue("audit.order-status", persistent: true)
       v
[RabbitMQ Queue: audit.order-status] ---> [Serviço de Auditoria Consumidor]
```

---

## 4. Detalhamento de Entidades e Value Objects (Domain Layer)

### 4.1. `Coordinates` & `distanceKm` ([coordinates.ts](../services/backend/src/domain/value-objects/coordinates.ts))
- **Value Object**: `Coordinates` (`readonly lat: number; readonly lng: number;`).
- **Validação (`createCoordinates`)**: Verifica se os números são finitos e se estão nos limites geográficos válidos (\(-90 \le lat \le 90\) e \(-180 \le lng \le 180\)).
- **Cálculo da Distância (`distanceKm`)**: Implementa a fórmula da distância de **Haversine**:
  \[
  a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta \lambda}{2}\right)
  \]
  \[
  d = 2 \cdot R \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)
  \]
  Onde \(R = 6371.0088\text{ km}\) é o raio médio da Terra.

### 4.2. `OrderStatus` ([order-status.ts](../services/backend/src/domain/value-objects/order-status.ts))
- Mapeia alias e termos regionalizados para os tipos canônicos de status de pedido (`'ARRIVED_AT_LOCATION'` | `'DELIVERED'`).
- Mapeamento suportado:
  - `"ARRIVED_AT_LOCATION"` ou `"CHEGOU_NO_LOCAL"` \(\rightarrow\) `'ARRIVED_AT_LOCATION'`
  - `"DELIVERED"` ou `"ENTREGUE"` \(\rightarrow\) `'DELIVERED'`

### 4.3. `Telemetry` & `TelemetryUpdate` ([telemetry.ts](../services/backend/src/domain/entities/telemetry.ts))
- **Interface `Telemetry`**: Posição bruta reportada pelo veículo (`orderId`, `driverId`, `position`, `destination`).
- **Interface `TelemetryUpdate`**: Entidade enriquecida pelo backend contendo `remainingDistanceKm` (arredondada para 3 casas decimais) e `receivedAt` (string ISO 8601).
- **Função `createTelemetryUpdate(telemetry, receivedAt)`**: Constrói imutavelmente o objeto final de atualização.

### 4.4. `OrderStatusChangeInput` & `createOrderStatusChange` ([order-status-change.ts](../services/backend/src/domain/entities/order-status-change.ts))
- Cria a estrutura padronizada de evento de auditoria `OrderStatusAudit` adicionando o timestamp exato em que o evento ocorreu no sistema.

---

## 5. Análise Classe por Classe (Mapeamento Completo)

| Arquivo / Símbolo | Tipo | Camada | Responsabilidade Principal | Métodos / Funções Chave |
| --- | --- | --- | --- | --- |
| [`coordinates.ts`](../services/backend/src/domain/value-objects/coordinates.ts) | File / Module | Domain | Define o Value Object de coordenadas e regras de cálculo de distância. | `createCoordinates()`, `distanceKm()` |
| [`order-status.ts`](../services/backend/src/domain/value-objects/order-status.ts) | File / Module | Domain | Normalização de aliases de status de pedidos. | `parseOrderStatus()` |
| [`telemetry.ts`](../services/backend/src/domain/entities/telemetry.ts) | File / Module | Domain | Entidades e regras de montagem de atualizações de telemetria. | `createTelemetryUpdate()` |
| [`order-status-change.ts`](../services/backend/src/domain/entities/order-status-change.ts) | File / Module | Domain | Constrói o evento imutável de auditoria de mudança de status. | `createOrderStatusChange()` |
| [`car-movement-message.ts`](../services/backend/src/application/dto/car-movement-message.ts) | Interface DTO | Application | DTO de transporte da mensagem de movimento (payload em string JSON). | — |
| [`car-movement-publisher.ts`](../services/backend/src/application/ports/car-movement-publisher.ts) | Interface Port | Application | Porta de saída para publicação de movimentações. | `publish(update)` |
| [`car-movement-subscriber.ts`](../services/backend/src/application/ports/car-movement-subscriber.ts) | Interface Port | Application | Porta de saída para assinatura de movimentações via callback. | `subscribe(onMovement)` |
| [`audit-service.ts`](../services/backend/src/application/ports/audit-service.ts) | Interface Port | Application | Porta de saída para comunicação desacoplada com o serviço de auditoria. | `logOrderStatus(event)` |
| [`receive-telemetry.ts`](../services/backend/src/application/use-cases/receive-telemetry.ts) | Class Use Case | Application | Orquestra a recepção, cálculo de distância e publicação de telemetria. | `execute(telemetry)` |
| [`stream-car-movements.ts`](../services/backend/src/application/use-cases/stream-car-movements.ts) | Class Use Case | Application | Orquestra a inscrição contínua no canal de movimentação de veículos. | `execute(onMovement)` |
| [`update-order-status.ts`](../services/backend/src/application/use-cases/update-order-status.ts) | Class Use Case | Application | Orquestra a geração e o envio do evento de mudança de status para auditoria. | `execute(input)` |
| [`redis-car-movement-publisher.ts`](../services/backend/src/infrastructure/redis/redis-car-movement-publisher.ts) | Class Adapter | Infrastructure | Adaptador Redis Pub/Sub que publica JSON string no canal `car-movements`. | `publish(update)` |
| [`redis-car-movement-subscriber.ts`](../services/backend/src/infrastructure/redis/redis-car-movement-subscriber.ts) | Class Adapter | Infrastructure | Adaptador Redis que duplica a conexão (`client.duplicate()`) para assinar o canal de forma não bloqueante. | `subscribe()`, `createRedisClient()` |
| [`amqp-audit-service.ts`](../services/backend/src/infrastructure/amqp/amqp-audit-service.ts) | Class Adapter | Infrastructure | Adaptador AMQP (amqplib) para RabbitMQ. Gerencia conexão/canal com lazy loading e recupera falhas. | `logOrderStatus()`, `getChannel()`, `getConnection()` |
| [`telemetry-controller.ts`](../services/backend/src/interfaces/http/controllers/telemetry-controller.ts) | Class Controller | Interfaces | Controller Express do endpoint `POST /telemetry`. Valida o corpo da requisição HTTP. | `handle()`, `parseTelemetry()` |
| [`stream-car-movement-controller.ts`](../services/backend/src/interfaces/http/controllers/stream-car-movement-controller.ts) | Class Controller | Interfaces | Controller Express de SSE para `GET /stream`. Gerencia headers, keep-alive de 30s e encerramento de conexão. | `handle()` |
| [`order-status-controller.ts`](../services/backend/src/interfaces/http/controllers/order-status-controller.ts) | Class Controller | Interfaces | Controller Express para `POST /orders/:orderId/status`. Valida parâmetros e lança a alteração de status. | `handle()` |
| [`create-app.ts`](../services/backend/src/interfaces/http/create-app.ts) | Function Factory | Interfaces | Instancia a aplicação Express, registra middlewares de CORS e JSON, e configura o roteamento. | `createApp()` |
| [`main.ts`](../services/backend/src/main/main.ts) | Entry Point | Main | Ponto de entrada do serviço. Lê variáveis de ambiente, realiza a injeção de dependências e inicia o servidor. | `bootstrap()` |

---

## 6. Guia para Decisões Arquiteturais e Evolução

### 6.1. Acoplamento e Desacoplamento
- **Pontos Fortes**: O uso de portas de saída (`CarMovementPublisher`, `AuditService`) garante que trocar a tecnologia de mensageria (ex: trocar Redis por Kafka ou RabbitMQ por gRPC) não altere nenhuma linha de código da camada de aplicação ou domínio.
- **Isolamento de Conexões Redis**: O adaptador [`RedisCarMovementSubscriber`](../services/backend/src/infrastructure/redis/redis-car-movement-subscriber.ts#L14) utiliza `client.duplicate()`. Isso é essencial no Redis, pois quando um cliente entra em modo *Subscribe*, ele não pode executar outros comandos padrão (como `PUBLISH` ou `GET`).

### 6.2. Escalabilidade Horizontal e Concorrência
- **Volatilidade do Redis Pub/Sub**: O Redis Pub/Sub é do tipo *fire-and-forget*. Ele não armazena histórico de posições. Se um frontend reconectar via SSE, ele só receberá movimentações ocorridas a partir do instante da conexão.
- **Escala de Instâncias do Backend**:
  - Se escalarmos o Backend para 2 ou mais réplicas atrás de um Load Balancer, a publicação no Redis Pub/Sub garantirá que **todas as réplicas** recebam as atualizações de localização e repassem para os clientes SSE conectados a cada instância específica.

### 6.3. Oportunidades de Refatoração e Melhorias
1. **Persistência de Última Posição Conhecida**: Para resolver o problema de o frontend inicializar com mapa vazio, pode-se adicionar um armazenamento no Redis Hashes (`HSET driver:location ...`) ao receber a telemetria, permitindo que novos clientes conectados via SSE consultem a posição inicial antes de entrar na transmissão contínua.
2. **Circuit Breaker / Dead Letter Queue no AMQP**: No `AmqpAuditService`, se a conexão com o RabbitMQ cair durante a execução de uma requisição de status, a promessa pode falhar. Implementar um mecanismo de *retry com exponential backoff* ou buffer em memória evitará perda de eventos de auditoria se o broker ficar temporariamente indisponível.

---

## Documentação relacionada

- [service-audit.md](service-audit.md) — consumidor AMQP e API de entregas
- [service-publisher.md](service-publisher.md) — simulador de rotas
- [adr.md](adr.md) — decisões arquiteturais
- [links-e-comandos.md](links-e-comandos.md) — URLs e comandos
