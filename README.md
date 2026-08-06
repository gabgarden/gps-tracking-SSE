# Rastreamento de entregas

Monorepo com serviços separados seguindo **Arquitetura Limpa** (Ports and Adapters).

## Estrutura

```
gps-tracking-SSE/
├── shared/                 # Contratos compartilhados (eventos de auditoria)
├── services/
│   ├── backend/            # API HTTP, SSE e integração Redis/AMQP
│   ├── audit/              # Consumidor de eventos de auditoria
│   └── publisher/          # Simulador de envio de telemetria
├── frontend/               # Dashboard (HTML + nginx)
└── docker-compose.yml
```

Cada serviço em `services/` possui as camadas:

- `domain/` — entidades e regras puras
- `application/` — casos de uso e portas (interfaces)
- `infrastructure/` — adaptadores (Redis, AMQP, OSRM, HTTP)
- `interfaces/` — entrada/saída (controllers HTTP, quando aplicável)
- `main/` — composição e bootstrap

## Executar com Docker

```bash
docker compose up
```

| Serviço    | URL / Porta                          |
| ---------- | ------------------------------------ |
| Frontend   | http://localhost:3000                |
| Backend    | http://localhost:8080                |
| RabbitMQ   | http://localhost:15672 (management)  |

## Executar localmente (sem Docker)

```bash
npm install
npm run dev:backend     # porta 8080
npm run dev:audit       # consome fila AMQP
npm run dev:publisher   # simula rotas e envia telemetria
```

Para o frontend local, sirva `frontend/index.html` com proxy para `/stream` apontando ao backend, ou acesse via Docker na porta 3000.

## Telemetria

`POST /telemetry` recebe a posição do motorista e o destino do pedido. O caso de uso `ReceiveTelemetry` calcula `remainingDistanceKm` com Haversine e publica no Redis.

## Auditoria

`POST /orders/:orderId/status` dispara `UpdateOrderStatus`, que publica na fila `audit.order-status`. O serviço `audit` consome e registra os eventos de forma independente.

Contratos compartilhados ficam em `shared/src/audit/`.

Documentação detalhada: [architecture.md](architecture.md).
