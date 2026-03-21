# 05_fStack — Full Stack Hello World

A full-stack CRUD application wired with Kafka-based event streaming, metrics collection, and observability dashboards.

## Stack

| Layer | Technology | Port |
|---|---|---|
| Frontend | React (CRA) | 3000 |
| Backend | Node.js + Express | 4000 |
| Database | PostgreSQL 18 | 5432 |
| Message Queue | Apache Kafka (KRaft) | 9092 |
| Metrics | Prometheus + prom-client | 9090 |
| Dashboards | Grafana | 3001 |

## Architecture

```
React UI
   │
   ├── GET/PUT/DELETE → Express Backend (port 4000)
   │                         │
   │                    ┌────┴────┐
   │                 Kafka     PostgreSQL
   │               (produce)  (direct read/update/delete)
   │                    │
   │              Kafka Consumer
   │                    │
   │              PostgreSQL (insert on POST)
   │
   └── Prometheus scrapes /metrics → Grafana dashboard
```

**POST flow (event-driven):** Frontend → Backend → Kafka producer → Kafka consumer → PostgreSQL insert

**GET/PUT/DELETE flow (direct):** Frontend → Backend → PostgreSQL

## Project Structure

```
05_fStack/
├── docker-compose.yml
├── prometheus.yml
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/prometheus.yml   # auto-wires Prometheus datasource
│   │   └── dashboards/default.yml       # auto-loads dashboard files
│   └── dashboards/
│       └── fstack-overview.json         # pre-built dashboard
├── bend/                                # Express backend
│   ├── server.js                        # routes (CRUD + /metrics)
│   ├── db.js                            # PostgreSQL pool + queries
│   ├── kafka.js                         # producer + consumer + admin
│   ├── metrics.js                       # prom-client counter
│   ├── package.json
│   └── Dockerfile
└── fend/                                # React frontend
    ├── src/
    │   ├── app.js                       # CRUD UI (Create, Read, Update, Delete)
    │   └── index.js
    ├── public/index.html
    ├── package.json
    └── Dockerfile
```

## Running the Project

### First time (full build)
```bash
docker compose build --no-cache
docker compose up
```

### Subsequent runs
```bash
docker compose up
```

### Tear down (keep volumes)
```bash
docker compose down
```

### Tear down and wipe all data
```bash
docker compose down -v
```

### Rebuild a single service
```bash
docker compose build --no-cache <service>
docker compose up --force-recreate <service>
```

## Endpoints

| Method | URL | Description |
|---|---|---|
| POST | `/messages` | Create a message (goes through Kafka) |
| GET | `/messages` | Fetch all messages |
| PUT | `/messages/:id` | Update a message by id |
| DELETE | `/messages/:id` | Delete a message by id |
| GET | `/metrics` | Prometheus metrics endpoint |

## Observability

### Prometheus — `http://localhost:9090`
- **Status → Targets** — verify `backend:4000` is `UP`
- Useful queries:
  - `api_requests_total` — total request count
  - `rate(api_requests_total[1m])` — requests per second
  - `up{job="node-api"}` — backend health (1=up, 0=down)

### Grafana — `http://localhost:3001`
- Login: `admin` / `admin`
- Dashboard **"Full Stack Overview"** is auto-provisioned on startup
- Panels: Total Requests, Request Rate, Backend Up, Memory Usage, Event Loop Lag

### Kafka topic verification
```bash
# List topics
docker exec -it kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list

# Read messages from topic
docker exec -it kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic hello-topic \
  --from-beginning \
  --timeout-ms 5000
```
