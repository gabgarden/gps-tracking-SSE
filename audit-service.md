# Documentação Arquitetural: Serviço de Auditoria (`@gps-tracking/audit`)

## 1. Visão Geral e Responsabilidades

O serviço **Audit** (`services/audit`) é um microsserviço independente e desacoplado cuja responsabilidade primária é o **Processamento Assíncrono e Registro Auditável de Mudanças de Status de Entregas**.

Suas responsabilidades incluem:

1. **Consumo Assíncrono Durável**: Escutar a fila RabbitMQ `audit.order-status` via protocolo AMQP, garantindo processamento com *acknowledgement* manual (`ack`/`nack`).
2. **Validação de Invariantes de Domínio**: Validar a integridade de cada evento de auditoria no domínio (`OrderStatusAuditEvent`), rejeitando mensagens corrompidas ou com campos inválidos sem travar o consumidor.
3. **Escrita e Armazenamento**: Registrar o evento nos destinos configurados (`ConsoleAuditEventWriter` para logs auditáveis de sistema e `InMemoryAuditEventStore` para rápida recuperação em APIs).
4. **Exposição de API HTTP de Consulta e Streaming**: Expor rotas HTTP para listar entregas concluídas (`GET /audit/deliveries`) e realizar streaming em tempo real de eventos de entrega via SSE (`GET /audit/stream`).
5. **Resiliência e Retry no Bootstrap**: Inicializar a conexão AMQP com estratégia de tentativa e reconexão (*retry mechanism*) caso o broker RabbitMQ ainda esteja subindo.

---

## 2. Arquitetura e Camadas (Clean Architecture / Ports & Adapters)

```text
+---------------------------------------------------------------------------------------+
|                            AMQP CONSUMER & SERVIDORES HTTP                            |
|        [AmqpOrderStatusConsumer]                [createAuditHttpServer]               |
+------------------------------------------+--------------------------------------------+
                                           | (invoca caso de uso)
                                           v
+---------------------------------------------------------------------------------------+
|                                 APPLICATION USE CASES                                 |
|  [RecordOrderStatusAudit]          [ListDeliveries]            [StreamDeliveries]     |
+------------------------------------------+--------------------------------------------+
                                           | (usa portas e domínio)
                                           v
+---------------------------------------------------------------------------------------+
|                                   APPLICATION PORTS                                   |
|           [AuditEventWriter]                             [AuditEventStore]            |
+------------------------------------------+--------------------------------------------+
                                           ^
                                           | (implementam as interfaces)
+------------------------------------------+--------------------------------------------+
|                                INFRASTRUCTURE ADAPTERS                                |
|        [ConsoleAuditEventWriter]                     [InMemoryAuditEventStore]        |
+---------------------------------------------------------------------------------------+
|                                    DOMÍNIO PURO                                       |
|  • OrderStatusAuditEvent (create, validações de invariantes, isDelivery, toDTO)        |
+---------------------------------------------------------------------------------------+
```

---

## 3. Fluxos de Dados e Sequência

### 3.1. Consumo AMQP e Processamento de Auditoria

```text
[RabbitMQ Queue: audit.order-status]
       |
       | 1. Mensagem AMQP (JSON payload)
       v
[AmqpOrderStatusConsumer]
       |
       | 2. execute(event)
       v
[RecordOrderStatusAudit] ---> [OrderStatusAuditEvent] (3. OrderStatusAuditEvent.create)
       |                                   |
       |-- VÁLIDO:                         |-- INVÁLIDO:
       |   4. write(dto) -> Console        |   Lança erro de validação
       |   5. append(dto) -> Store         v
       |   6. channel.ack(message)      channel.nack(message, false, false) [Descartado]
       v
[Console & InMemoryAuditEventStore]
```

### 3.2. Streaming de Entregas via API HTTP (`GET /audit/stream`)

```text
[Cliente Frontend (EventSource)]
       |
       | 1. GET /audit/stream
       v
[createAuditHttpServer] (2. Envia headers SSE text/event-stream)
       |
       v
[StreamDeliveries]
       |
       +---> 3. list() -> Envia entregas históricas existentes
       |
       +---> 4. subscribe(listener) -> Escuta novos eventos de entregas recebidos no Store
       |
       v
[Transmissão SSE (event: deliveryRecorded \n data: {...})]
```

---

## 4. Detalhamento de Entidades e Validações de Domínio

### 4.1. `OrderStatusAuditEvent` ([order-status-audit-event.ts](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/audit/src/domain/entities/order-status-audit-event.ts))
- **Encapsulamento**: Construtor `private` forçando o uso do método estático de fábrica `OrderStatusAuditEvent.create(input)`.
- **Invariantes e Regras de Negócio Validadas**:
  1. `orderId`, `driverId` e `occurredAt` devem ser strings não vazias (após `trim()`).
  2. `status` deve ser rigorosamente `'ARRIVED_AT_LOCATION'` ou `'DELIVERED'`.
  3. `durationMs` (se fornecido) deve ser um número finito não negativo (\(\ge 0\)).
- **Métodos**:
  - `isDelivery()`: Retorna `true` se o status for `'DELIVERED'`.
  - `toDTO()`: Retorna o objeto imutável `OrderStatusAudit`.
- **Função Utilitária**: `isDeliveryEvent(event)` para filtragem rápida em arrays.

---

## 5. Análise Classe por Classe (Mapeamento Completo)

| Arquivo / Símbolo | Tipo | Camada | Responsabilidade Principal | Métodos / Funções Chave |
| --- | --- | --- | --- | --- |
| [`order-status-audit-event.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/audit/src/domain/entities/order-status-audit-event.ts) | Class Entity | Domain | Representação rica do evento de auditoria com validações estritas de domínio. | `create()`, `isDelivery()`, `toDTO()`, `isDeliveryEvent()` |
| [`audit-event-writer.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/audit/src/application/ports/audit-event-writer.ts) | Interface Port | Application | Porta de saída para persistência ou logging primário de auditoria. | `write(event)` |
| [`audit-event-store.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/audit/src/application/ports/audit-event-store.ts) | Interface Port | Application | Porta para armazenamento e escuta de eventos em memória/banco. | `append()`, `list()`, `subscribe()` |
| [`record-order-status-audit.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/audit/src/application/use-cases/record-order-status-audit.ts) | Class Use Case | Application | Caso de uso que valida a mensagem recebida e aciona writer e store. | `execute(input)` |
| [`list-deliveries.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/audit/src/application/use-cases/list-deliveries.ts) | Class Use Case | Application | Retorna histórico de entregas concluídas (`DELIVERED`) em ordem cronológica inversa. | `execute()` |
| [`stream-deliveries.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/audit/src/application/use-cases/stream-deliveries.ts) | Class Use Case | Application | Transmite entregas históricas e subscreve novas entregas em tempo real via SSE. | `execute(onDelivery)` |
| [`amqp-order-status-consumer.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/audit/src/infrastructure/amqp/amqp-order-status-consumer.ts) | Class Adapter | Infrastructure | Adaptador AMQP (amqplib) para RabbitMQ. Gerencia o consumo da fila `audit.order-status` e o ciclo de `ack`/`nack`. | `start()`, `handleMessage()` |
| [`console-audit-event-writer.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/audit/src/infrastructure/logging/console-audit-event-writer.ts) | Class Adapter | Infrastructure | Adaptador que grava logs estruturados no `stdout`. | `write(event)` |
| [`in-memory-audit-event-store.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/audit/src/infrastructure/storage/in-memory-audit-event-store.ts) | Class Adapter | Infrastructure | Armazena eventos em memória em `Array` interno e gerencia ouvintes em um `Set`. | `append()`, `list()`, `subscribe()` |
| [`create-audit-http-server.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/audit/src/interfaces/http/create-audit-http-server.ts) | File / Module | Interfaces | Servidor HTTP nativo Node.js (`node:http`) sem frameworks externos. Provê rotas `/health`, `/audit/deliveries` e `/audit/stream`. | `createAuditHttpServer()`, `handleRequest()`, `handleAuditStream()` |
| [`main.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/audit/src/main/main.ts) | Entry Point | Main | Ponto de entrada do serviço. Implementa mecanismo de reconexão (`startConsumerWithRetry`) e inicializa o servidor HTTP na porta 8081. | `bootstrap()`, `startConsumerWithRetry()` |

---

## 6. Guia para Decisões Arquiteturais e Evolução

### 6.1. Resiliência do Consumidor AMQP
- **Tratamento de Mensagens Inválidas (`nack`)**:
  No arquivo [`amqp-order-status-consumer.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/audit/src/infrastructure/amqp/amqp-order-status-consumer.ts#L33), quando o JSON é malformado ou falha na validação do domínio (`RecordOrderStatusAudit`), o consumidor executa `channel.nack(message, false, false)`.
  O segundo parâmetro `requeue: false` instrui o RabbitMQ a **não colocar a mensagem de volta na fila**, evitando loops infinitos de erro de parse.
- **Bootstrapping Resiliente**:
  O método [`startConsumerWithRetry`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/audit/src/main/main.ts#L18) tenta se conectar ao RabbitMQ por até 15 vezes com intervalo de 2 segundos. Isso garante resiliência em ambientes containerizados (Docker Compose / Kubernetes) quando os serviços inicializam em paralelo.

### 6.2. Arquitetura do Servidor HTTP Nativo (`node:http`)
- O serviço de auditoria utiliza o módulo nativo `node:http` em vez do Express. Isso reduz a pegada de memória (*memory footprint*) e o tempo de inicialização do container, ideal para serviços puramente focados em processamento de background e APIs simples de consulta.

### 6.3. Recomendações para Evolução em Produção
1. **Persistência Relacional / NoSQL**: Substituir o [`InMemoryAuditEventStore`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/audit/src/infrastructure/storage/in-memory-audit-event-store.ts) por um repositório PostgreSQL ou MongoDB para manter o histórico de auditoria imutável e durável entre reinicializações do container.
2. **Dead Letter Exchange (DLX)**: Configurar no RabbitMQ uma fila de *Dead Letter* para onde mensagens rejeitadas (`nack`) sejam encaminhadas para análise e depuração.
