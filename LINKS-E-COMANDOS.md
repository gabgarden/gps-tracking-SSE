# GPS Tracking — links e comandos

Padrão igual ao `sales-system` e `blood-match` na VPS: cada app tem a própria rede Docker, nginx na frente e só a porta pública publicada no host.

| App na VPS | Pasta | Porta pública |
| --- | --- | --- |
| sales-system | `/opt/sales-system` | `80` / `443` |
| blood-match | (compose blood-match) | `8082` (nginx) e `8080` (backend) |
| **gps-tracking** | `/opt/gps-tracking-sse` | **`8083`** |

Não use `80`, `443`, `8080` nem `8082` neste projeto — já estão ocupadas.

---

## Links

### Desenvolvimento (local)

| O quê | URL |
| --- | --- |
| Mapa / frontend | http://localhost:3000 |
| Health do backend (via nginx) | http://localhost:3000/health |
| Backend direto | http://localhost:8080/health |
| Audit direto | http://localhost:8081/health |
| Lista de entregas | http://localhost:3000/audit/deliveries |
| SSE do mapa | http://localhost:3000/stream |
| RabbitMQ management | http://localhost:15672 (`guest` / `guest`) |

### Produção (VPS)

Troque `SEU_IP` pelo IP do servidor (`srv1892531`).

| O quê | URL |
| --- | --- |
| Mapa / frontend | http://SEU_IP:8083 |
| Health | http://SEU_IP:8083/health |
| Lista de entregas | http://SEU_IP:8083/audit/deliveries |
| SSE do mapa | http://SEU_IP:8083/stream |

Redis, RabbitMQ, backend, audit e publisher **não** ficam expostos no host. O simulador fala com o backend pela rede Docker.

---

## Desenvolvimento (local)

Na pasta do projeto:

```bash
docker compose up
```

Rebuild quando mudar Dockerfile ou dependências:

```bash
docker compose up --build
```

Parar:

```bash
docker compose down
```

Logs:

```bash
docker compose logs -f
docker compose logs -f backend publisher audit
```

Sem Docker (precisa de Redis + RabbitMQ no ar):

```bash
npm install
npm run dev:backend
npm run dev:audit
npm run dev:publisher
```

Testes manuais:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/audit/deliveries

curl -X POST http://localhost:8080/telemetry \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":\"teste-1\",\"driverId\":\"dev-1\",\"lat\":-21.75,\"lng\":-41.32,\"destinationLat\":-21.76,\"destinationLng\":-41.33}"

curl -X POST http://localhost:8080/orders/pedido-manual-1/status \
  -H "Content-Type: application/json" \
  -d "{\"driverId\":\"dev-1\",\"status\":\"DELIVERED\",\"routeName\":\"Teste manual\",\"durationMs\":120000}"
```

---

## Produção (VPS)

### 1. Primeira vez

```bash
cd /opt
git clone https://github.com/gabgarden/gps-tracking-SSE.git gps-tracking-sse
cd /opt/gps-tracking-sse
cp .env.example .env
```

Edite `.env` se quiser outra porta ou senha do RabbitMQ.

### 2. Subir

```bash
cd /opt/gps-tracking-sse
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### 3. Conferir

```bash
docker compose -f docker-compose.prod.yml ps
curl http://127.0.0.1:8083/health
curl http://127.0.0.1:8083/audit/deliveries
docker compose -f docker-compose.prod.yml logs -f nginx backend audit publisher
```

### 4. Comandos do dia a dia

```bash
# status
docker compose -f docker-compose.prod.yml ps

# logs
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs -f --tail=100 backend

# reiniciar um serviço
docker compose -f docker-compose.prod.yml restart publisher

# parar (mantém volumes)
docker compose -f docker-compose.prod.yml down

# parar e apagar volumes Redis/RabbitMQ (zera dados)
docker compose -f docker-compose.prod.yml down -v

# rebuild só de um serviço
docker compose -f docker-compose.prod.yml up -d --build backend
```

### 5. Atualizar o código na VPS

```bash
cd /opt/gps-tracking-sse
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker image prune -f
```

---

## O que sobe em cada ambiente

| Serviço | Dev (`docker-compose.yml`) | Prod (`docker-compose.prod.yml`) |
| --- | --- | --- |
| nginx / frontend | `3000:80` | `8083:80` |
| backend | `8080:8080` | interno |
| audit | `8081:8081` | interno |
| publisher | interno | interno |
| redis | `6379:6379` | interno + volume |
| rabbitmq | `5672` e `15672` | interno + volume |

Não rode o compose de **dev** na VPS: as portas `8080` e `6379` batem com o que já está no ar.

---

## Disco da VPS

O servidor já tem ~51 GB de build cache Docker recuperável. Depois de um deploy:

```bash
docker builder prune -f
docker image prune -f
docker system df
```

---

## Containers e rede (produção)

```
gps-tracking-nginx       :8083 → mapa, /stream, /audit/, /health
gps-tracking-backend     Redis Pub/Sub + SSE + AMQP
gps-tracking-audit       consome fila e expõe /audit
gps-tracking-publisher   simulador de rotas (OSRM)
gps-tracking-redis
gps-tracking-rabbitmq

rede:   gps-tracking_default
volumes: gps-tracking_redis_data, gps-tracking_rabbitmq_data
```
