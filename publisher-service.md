# Documentação Arquitetural: Serviço Simulador (`@gps-tracking/publisher`)

## 1. Visão Geral e Responsabilidades

O serviço **Publisher** (`services/publisher`) é um **Simulador de Tráfego e Entregas em Tempo Real**. Ele é responsável por simular autonomamente o deslocamento urbano de entregadores pela malha viária da cidade de Campos dos Goytacazes/RJ.

Suas responsabilidades principais incluem:

1. **Obtenção de Rotas Reais (OSRM)**: Consultar o serviço externo OSRM (*Open Source Routing Machine*) via API HTTP pública (`https://router.project-osrm.org`) para gerar a geometria exata de navegação (conjunto de coordenadas `[longitude, latitude]` em formato GeoJSON) entre pontos da cidade.
2. **Máquina de Estados de Simulação (`DeliverySimulation`)**: Manter o estado interno do veículo (posição atual na rota, contagem de passos, tempo transcorrido, id do pedido simulado e alternância aleatória de rotas).
3. **Disparo Periódico de Telemetria (`TelemetrySender`)**: Enviar dados de localização a cada intervalo regular configurável (`SIMULATION_INTERVAL_MS`, padrão 1.5s) via requisição HTTP `POST /telemetry` para o Backend.
4. **Notificação de Conclusão de Entrega (`OrderStatusNotifier`)**: Ao atingir o último ponto geométrico de uma rota, calcular a duração total da viagem e notificar o Backend via `POST /orders/:orderId/status` com o status `DELIVERED`, acionando a auditoria.
5. **Transição Automática de Rotas**: Alternar para uma nova rota aleatória do catálogo ao concluir uma entrega, garantindo que o simulador execute continuamente em loop.

---

## 2. Arquitetura e Camadas (Clean Architecture / Ports & Adapters)

```text
+---------------------------------------------------------------------------------------+
|                                    MAIN / BOOTSTRAP                                   |
|                          [main.ts - Catálogo de Rotas]                                |
+------------------------------------------+--------------------------------------------+
                                           | (instancia e inicia)
                                           v
+---------------------------------------------------------------------------------------+
|                                 APPLICATION USE CASE                                  |
|                            [SimulateDeliveryRoutes]                                   |
+------------------------------------------+--------------------------------------------+
                                           | (usa portas de I/O)
                                           v
+---------------------------------------------------------------------------------------+
|                                   APPLICATION PORTS                                   |
|      [RouteProvider]             [TelemetrySender]          [OrderStatusNotifier]     |
+------------------------------------------+--------------------------------------------+
                                           ^
                                           | (implementam as interfaces)
+------------------------------------------+--------------------------------------------+
|                                INFRASTRUCTURE ADAPTERS                                |
|    [OsrmRouteProvider]          [HttpTelemetrySender]       [HttpOrderStatusNotifier]  |
+---------------------------------------------------------------------------------------+
|                                    DOMÍNIO PURO                                       |
|  • DeliverySimulation (start, tick, beginRoute)  • SimulationTickResult               |
|  • RouteConfig / RouteCoordinates                • TelemetryPayload                   |
+---------------------------------------------------------------------------------------+
```

---

## 3. Fluxos de Dados e Sequência

### 3.1. Ciclo de Vida da Simulação e Envio de Telemetria

```text
[Main / Bootstrap]
       |
       | 1. Instancia simulador e busca geometria inicial (OSRM API)
       v
[OsrmRouteProvider] ---> GET https://router.project-osrm.org/route/v1/driving/...
       |
       v (retorna Array de coordenadas [ [lng, lat], ... ])
[SimulateDeliveryRoutes] <---> [DeliverySimulation (Domain)]
       |
       |--- Loop a cada SIMULATION_INTERVAL_MS (1500ms):
       |
       +---> PASSO INTERMEDIÁRIO (kind: 'telemetry'):
       |     1. tick() avança passo
       |     2. HttpTelemetrySender -> POST /telemetry -> [Backend API]
       |
       +---> ROTA CONCLUÍDA (kind: 'completed'):
             1. HttpOrderStatusNotifier -> POST /orders/simulated-order-N/status (DELIVERED)
             2. Busca nova rota no OsrmRouteProvider
             3. DeliverySimulation.beginRoute(nextRouteIndex)
```

---

## 4. Detalhamento do Domínio e Máquina de Estados

### 4.1. `DeliverySimulation` ([delivery-simulation.ts](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/publisher/src/domain/entities/delivery-simulation.ts))
A classe `DeliverySimulation` é o coração do domínio do simulador. Trata-se de uma entidade rica totalmente isolada de operações de entrada/saída (I/O).

- **Atributos de Estado**:
  - `routeIndex`: Índice da rota ativa no array de configurações.
  - `stepIndex`: Posição atual do entregador ao longo do vetor de coordenadas da geometria da rota.
  - `routeStartedAt`: Timestamp Unix (`ms`) de quando a rota atual começou.
  - `completing`: Trava booleana (*lock*) para evitar disparo duplo de conclusão enquanto a transição de rota ocorre.
- **Identificador Dinâmico de Pedido**:
  O método `orderIdFor(routeIndex)` gera o ID `simulated-order-${routeIndex + 1}`. Isso permite que o frontend diferencie a troca de rotas sem necessidade de um campo `routeId` extra.
- **Método `tick(coordinates, now)`**:
  - Se `stepIndex < coordinates.length`: Avança `stepIndex += 1` e retorna um resultado do tipo `{ kind: 'telemetry', telemetry: TelemetrySnapshot }`.
  - Se `stepIndex >= coordinates.length`: Marca `completing = true`, sorteia a próxima rota (garantindo que a nova rota seja diferente da recém-concluída via `pickRouteIndex`) e retorna `{ kind: 'completed', delivery: CompletedDelivery, nextRouteIndex }`.

---

## 5. Análise Classe por Classe (Mapeamento Completo)

| Arquivo / Símbolo | Tipo | Camada | Responsabilidade Principal | Métodos / Funções Chave |
| --- | --- | --- | --- | --- |
| [`route-on-map.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/publisher/src/domain/entities/route-on-map.ts) | File / Module | Domain | Interfaces de definição de rota (`RouteConfig`) e geometria (`RouteCoordinates`). | — |
| [`simulation-tick-result.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/publisher/src/domain/entities/simulation-tick-result.ts) | File / Module | Domain | Tipos de retorno polimórficos (*Discriminated Union*) do avanço do simulador. | — |
| [`delivery-simulation.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/publisher/src/domain/entities/delivery-simulation.ts) | Class Entity | Domain | Entidade rica que gerencia o progresso dos passos, o tempo de entrega e a troca de rotas. | `start()`, `tick()`, `beginRoute()`, `abortCompletion()` |
| [`telemetry-payload.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/publisher/src/application/dto/telemetry-payload.ts) | Interface DTO | Application | DTO que define a estrutura JSON enviada ao endpoint de telemetria do Backend. | — |
| [`route-provider.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/publisher/src/application/ports/route-provider.ts) | Interface Port | Application | Porta de entrada para obtenção da geometria detalhada da rota. | `getRouteCoordinates()` |
| [`telemetry-sender.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/publisher/src/application/ports/telemetry-sender.ts) | Interface Port | Application | Porta de saída para envio das coordenadas atuais do veículo ao Backend. | `send()` |
| [`order-status-notifier.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/publisher/src/application/ports/order-status-notifier.ts) | Interface Port | Application | Porta de saída para notificar a conclusão de uma entrega (`DELIVERED`). | `notify()` |
| [`simulate-delivery-routes.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/publisher/src/application/use-cases/simulate-delivery-routes.ts) | Class Use Case | Application | Orquestra a busca de rotas com cache, o loop temporal (`setInterval`) e a invocação dos adaptadores. | `start()`, `getRouteCoordinates()` |
| [`osrm-route-provider.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/publisher/src/infrastructure/osrm/osrm-route-provider.ts) | Class Adapter | Infrastructure | Adaptador que consome a API pública do OSRM para obter a rota de condução em GeoJSON. | `getRouteCoordinates()` |
| [`http-telemetry-sender.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/publisher/src/infrastructure/http/http-telemetry-sender.ts) | Class Adapter | Infrastructure | Adaptador HTTP que realiza o envio das posições de telemetria via `fetch`. | `send()` |
| [`http-order-status-notifier.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/publisher/src/infrastructure/http/http-order-status-notifier.ts) | Class Adapter | Infrastructure | Adaptador HTTP que notifica a alteração de status da ordem para a API de auditoria. | `notify()` |
| [`main.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/publisher/src/main/main.ts) | Entry Point | Main | Ponto de entrada do simulador. Contém o catálogo de 5 rotas reais em Campos/RJ e inicializa a simulação. | `bootstrap()` |

---

## 6. Catálogo de Rotas Pré-definidas (Campos dos Goytacazes/RJ)

As rotas são inicializadas no [`main.ts`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/publisher/src/main/main.ts#L11):

1. **Rota #1**: IFF Centro (`-41.3245, -21.7545`) \(\rightarrow\) Boulevard Shopping (`-41.3392, -21.7681`)
2. **Rota #2**: Rodoviária Roberto Silveira (`-41.3283, -21.7588`) \(\rightarrow\) IFF Centro (`-41.3245, -21.7545`)
3. **Rota #3**: Jardim do Liceu (`-41.3208, -21.7552`) \(\rightarrow\) Pelinca (`-41.3321, -21.7635`)
4. **Rota #4**: Cais do Lapa (`-41.3189, -21.7482`) \(\rightarrow\) UENF (`-41.2934, -21.7612`)
5. **Rota #5**: Av. 28 de Março (Parque Tamandaré) (`-41.3350, -21.7601`) \(\rightarrow\) IFF Centro (`-41.3245, -21.7545`)

---

## 7. Guia para Decisões Arquiteturais e Evolução

### 7.1. Cache e Resiliência contra Falhas no OSRM
- **Cache de Geometria em Memória**: O caso de uso [`SimulateDeliveryRoutes`](file:///c:/Users/garde/Desktop/projects/gps-tracking-SSE/services/publisher/src/application/use-cases/simulate-delivery-routes.ts#L22) armazena as coordenadas de rotas já consultadas no `Map<number, RouteCoordinates>`. Isso evita requisições redundantes à API pública do OSRM e reduz a latência ao reiniciar uma rota já conhecida.
- **Tratamento de Falhas na Transição de Rota**: Se a chamada HTTP ao OSRM falhar durante a transição para uma nova rota, o método `simulation.abortCompletion()` é invocado, destravando o lock de conclusão e permitindo tentar novamente sem quebrar o processo do Node.js.

### 7.2. Evolução para Múltiplos Entregadores Simultâneos
- Atualmente, o simulador roda para um único motorista (`simulated-driver-1`).
- Para evoluir para uma simulação com dezenas de entregadores simultâneos:
  - Pode-se alterar `SimulateDeliveryRoutes` para instanciar múltiplos objetos `DeliverySimulation`, cada um com seu próprio `driverId` e temporizador independente, enviando eventos concorrentemente ao Backend.
