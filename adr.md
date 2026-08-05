# Registro de Decisões Arquiteturais (ADR)

Este documento registra as decisões vigentes da Plataforma de Rastreamento de
Veículos e Logística em Tempo Real. A visão dos componentes, contratos e
fluxos está em [architecture.md](architecture.md).

## ADR 01 — Atualização do mapa por Server-Sent Events

- **Status:** Aceito
- **Data:** 04/08/2026

### Contexto

O dashboard precisa receber posições frequentes do entregador. O fluxo é de
leitura: a API envia atualizações ao navegador; comandos do motorista são
feitos por HTTP convencional.

### Decisão

Usar SSE em `GET /stream`. Cada atualização é enviada como evento `carMoved`.
O dashboard usa `EventSource` e atualiza o Leaflet a partir de
`position.lat`, `position.lng` e `remainingDistanceKm`.

### Consequências

- O navegador possui reconexão automática e não exige biblioteca de socket.
- O transporte é simples e compatível com HTTP.
- SSE é unidirecional; novos comandos continuam usando endpoints REST.
- Devem ser considerados limites de conexões HTTP/1.1 ao escalar.

## ADR 02 — Redis Pub/Sub para telemetria em tempo real

- **Status:** Aceito
- **Data:** 04/08/2026

### Contexto

Posições chegam continuamente e precisam alcançar todas as instâncias da API
que mantêm conexões SSE, sem acoplamento entre produtor e consumidores.

### Decisão

O caso de uso `ReceiveTelemetry` publica o evento enriquecido no canal Redis
`car-movements`, através de `CarMovementPublisher`. `StreamCarMovements`
recebe o evento por `CarMovementSubscriber` e o entrega ao SSE.

O simulador usa `POST /telemetry`; ele não publica diretamente no Redis. Isso
garante que toda posição passe pela validação e pelo cálculo de distância.

### Consequências

- Baixa latência e alto throughput para o estado visual do mapa.
- Perda eventual é aceitável: Redis Pub/Sub não persiste mensagens e uma nova
  posição rapidamente substitui a anterior.
- Redis Pub/Sub não deve ser usado como trilha de auditoria ou histórico.

## ADR 03 — Distância restante calculada no caso de uso

- **Status:** Aceito
- **Data:** 05/08/2026

### Contexto

O cliente precisa exibir a distância entre a posição reportada e o destino. O
valor não deve depender do frontend, que poderia aplicar fórmulas ou versões
distintas do contrato.

### Decisão

`ReceiveTelemetry` calcula `remainingDistanceKm` com Haversine e acrescenta o
campo ao evento publicado. A API recebe `lat`, `lng`, `destinationLat` e
`destinationLng` em `POST /telemetry`.

### Consequências

- Um único cálculo consistente para todos os consumidores.
- O valor é geodésico em linha reta; não representa distância de navegação em
  ruas. Uma futura integração de roteamento pode substituir a implementação
  atrás do caso de uso.

## ADR 04 — AMQP durável para eventos de auditoria

- **Status:** Aceito
- **Data:** 05/08/2026

### Contexto

Os status `ARRIVED_AT_LOCATION` e `DELIVERED` devem ser auditáveis. Ao
contrário da telemetria visual, a perda desses eventos não é aceitável.

### Decisão

Definir a porta `AuditService.logOrderStatus` e implementar o adaptador
`AmqpAuditService`. O adaptador envia mensagens persistentes para a fila
durável `audit.order-status` no RabbitMQ. O microsserviço `audit` consome a
fila de forma independente.

### Consequências

- A aplicação de pedidos não depende diretamente de AMQP ou RabbitMQ.
- Eventos sobrevivem à ausência temporária do consumidor.
- Há mais infraestrutura e latência que no Redis Pub/Sub, em troca de
durabilidade.

## ADR 05 — Ports and Adapters para isolar regras de negócio

- **Status:** Aceito
- **Data:** 05/08/2026

### Contexto

Regras de telemetria, streaming e auditoria não devem depender das bibliotecas
de transporte ou mensageria.

### Decisão

Os casos de uso dependem das portas `CarMovementPublisher`,
`CarMovementSubscriber` e `AuditService`. Redis, RabbitMQ, Express e SSE são
adaptadores de infraestrutura ou interface.

### Consequências

- Testes dos casos de uso podem usar implementações falsas das portas.
- Redis ou AMQP podem ser trocados sem reescrever as regras de negócio.
- A composição das dependências fica concentrada em `src/main/main.ts`.
