# 05_fStack — Event-Driven Architecture

A full-stack CRUD application built on **Apache Kafka event streaming**, **real-time Server-Sent Events (SSE)**, and **multi-consumer patterns** with PostgreSQL and Redis.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          React Frontend (3000)                       │
│  - Persistent SSE connection listening for UI updates                │
│  - POST/PUT/DELETE/GET calls to Express API                         │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ HTTP
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Express Backend (4000)                           │
│  Routes:                                                             │
│  - GET /messages         → reads from PostgreSQL                     │
│  - POST /messages        → produces message.created event to Kafka   │
│  - PUT /messages/:id     → produces message.updated event to Kafka   │
│  - DELETE /messages/:id  → produces message.deleted event to Kafka   │
│  - GET /events           → SSE endpoint (streams db-updated events) │
│  - GET /metrics          → Prometheus metrics                        │
└──────────────────────┬──────────────────────┬───────────────────────┘
                       │ Kafka produce        │ SSE push
                       │                      │
                       ▼                      ▼
        ┌──────────────────────┐      ┌──────────────────┐
        │  messages-events     │      │  EventBus        │
        │  (Apache Kafka)      │      │  (Node.js        │
        │                      │      │   EventEmitter)  │
        │ Topics:              │      │                  │
        │ - message.created    │      │ Event: db-updated│
        │ - message.updated    │      └──────────────────┘
        │ - message.deleted    │             △
        └──────────────────────┘             │ emits after DB write
                   │▲
                   ││
        ┌──────────┴┴──────────┐
        │                      │
        ▼                      ▼
   ┌────────────┐        ┌─────────────┐
   │ db-group   │        │redis-group  │
   │ Consumer-1 │        │Consumer-2   │
   └────────────┘        └─────────────┘
        │                      │
        ▼                      ▼
   ┌────────────┐        ┌─────────────┐
   │ PostgreSQL │        │   Redis     │
   │   (5432)   │        │  (6379)     │
   │            │        │             │
   │ - messages │        │ Cache:      │
   │   (source  │        │ - messages: │
   │    of      │        │   created   │
   │   truth)   │        │ - message:  │
   │            │        │   <id>      │
   └────────────┘        └─────────────┘
        △
        │ Direct read
        │ (GET /messages)
        │
   Frontend polls GET /messages
   on SSE db-updated event
```

---

## Data Flow — Step by Step

### 1. User sends a message (POST)
```
User clicks "Send"
         │
         ▼
axios.post('/messages', { content: 'hello' })
         │
         ▼
Express route receives → producer.send() to Kafka topic 'messages-events'
         │
         ├─ Event: { type: 'message.created', content: 'hello' }
         │
         └─ Response: { status: 'queued', content: 'hello' } (immediate)
```

### 2. Kafka Consumer-1 (db-group) processes the event
```
Kafka receives event from topic
         │
         ▼
dbConsumer (db-group) listens & processes
         │
         ▼
INSERT into messages table { content: 'hello' } → returns row with id=1
         │
         ▼
eventBus.emit('db-updated', { type: 'message.created' })
```

### 3. Kafka Consumer-2 (redis-group) processes the same event
```
Kafka receives event from topic (same event, different consumer group)
         │
         ▼
redisConsumer (redis-group) listens & processes
         │
         ▼
RPUSH messages:created 'hello'  OR  SET message:1 '{"id":1, "content":"hello"}'
(depending on event type)
         │
         ▼
Cache updated, DB write is complete
```

### 4. Frontend gets notified via SSE
```
EventBus emits 'db-updated'
         │
         ▼
SSE endpoint (GET /events) listening catches the event
         │
         ▼
res.write(`data: { "type": "message.created" }\n\n`)
         │
         ▼
Browser's EventSource listener receives the push
         │
         ▼
Calls fetchMessages() → GET /messages from PostgreSQL
         │
         ▼
UI re-renders with the new message
```

---

## Key Concepts

### Event-Driven Design
- **All writes go through Kafka** — no direct DB writes from routes
- **Two independent consumers** — DB persistence and cache mirror run in parallel
- **Eventual consistency** — DB and cache may briefly differ, but eventual consistency is guaranteed

### Kafka Topic: `messages-events`
Carries structured JSON events:
```json
{
  "type": "message.created",
  "content": "hello world"
}
```

```json
{
  "type": "message.updated",
  "id": 1,
  "content": "updated text"
}
```

```json
{
  "type": "message.deleted",
  "id": 1
}
```

### Consumer Groups
| Group | Responsibility | Side Effects |
|---|---|---|
| `db-group` | Writes all events to PostgreSQL (INSERT/UPDATE/DELETE) | Database is source of truth |
| `redis-group` | Mirrors events to Redis cache | Cache stays in sync with DB |

Each consumer group can independently offset cursor through the topic. If one fails, it can resume from the last committed offset.

### Server-Sent Events (SSE)
- **GET /events** — open persistent HTTP connection
- Once connected, server can push messages anytime: `data: {...}\n\n`
- Browser `EventSource` API auto-reconnects on disconnect
- One-way: server → client only (sufficient for this use case)

### EventBus
- Node.js `EventEmitter` instance shared across all routes and consumers
- When Consumer-1 finishes a DB write, it emits `db-updated`
- SSE endpoint listens and broadcasts to all connected clients
- **Not durable** — if SSE client misses the event, it won't retry (but GET /messages is the source of truth)

---

## Project Structure

```
bend/
├── server.js           # Express app, routes, SSE endpoint
├── kafka.js            # Kafka client, producer, topic admin
├── db.js               # PostgreSQL connection pool & queries
├── redisClient.js      # Redis connection & cache logic
├── eventBus.js         # Shared EventEmitter for db-updated events
├── metrics.js          # prom-client metrics
├── package.json        # Dependencies: express, kafkajs, pg, ioredis, cors, prom-client
└── consumers/
    ├── index.js        # starts all consumers
    ├── dbConsumer.js   # db-group: Kafka → PostgreSQL
    └── redisConsumer.js # redis-group: Kafka → Redis

fend/
├── src/
│   ├── app.js         # React UI, SSE EventSource listener
│   └── index.js       # React DOM root
├── public/index.html  # HTML root
└── package.json       # Dependencies: react, axios

docker-compose.yml     # Defines all services
prometheus.yml         # Prometheus scrape config
grafana/
├── provisioning/      # Auto-wires datasources and dashboards
└── dashboards/        # Pre-built dashboard JSON
```

---

## Endpoints

| Method | URL | Effect | Response |
|---|---|---|---|
| GET | `/messages` | Fetch all messages from PostgreSQL | `[{id, content, created_at}, ...]` |
| POST | `/messages` | Produce message.created event to Kafka | `{status: 'queued', content}` |
| PUT | `/messages/:id` | Produce message.updated event to Kafka | `{status: 'queued', id}` |
| DELETE | `/messages/:id` | Produce message.deleted event to Kafka | `{status: 'queued', id}` |
| GET | `/events` | SSE stream (client keeps connection open) | `data: {type: '...', ...}\n\n` |
| GET | `/metrics` | Prometheus metrics | `api_requests_total ...` |

---

## Wiring: How SSE Connects the Flow

### How UI knows to refresh without polling

1. User clicks "Save" on an edit
2. React fires: `await axios.put('/messages/1', { content: 'new' })`
3. Backend responds immediately: `{ status: 'queued', id: 1 }` — but nothing fetched yet
4. React routes `Promise` resolves, UI remains stale
5. **Meanwhile**, Kafka consumer-1 is processing the same event async
6. Consumer finishes DB UPDATE
7. Consumer calls `eventBus.emit('db-updated', { type: 'message.updated' })`
8. **SSE endpoint catches the emit** and immediately writes to the open HTTP stream
9. **Browser's EventSource listener fires** the `onmessage` handler
10. Handler calls `fetchMessages()`
11. **GET /messages** fetches fresh data from PostgreSQL
12. React state updates, UI re-renders

**No polling. No 600ms timeout. Real-time.**

---

## Running the Stack

### Full restart (with data wipe)
```bash
docker compose down -v
docker compose build --no-cache
docker compose up
```

### Subsequent runs
```bash
docker compose up
```

### Restart just backend (after code changes)
```bash
docker compose build --no-cache backend
docker compose up --force-recreate backend
```

### Shutdown (keep volumes)
```bash
docker compose down
```

---

## Testing the Flow

### 1. Send a message
```bash
curl -X POST http://localhost:4000/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "test message"}'
```
Response: `{"status":"queued","content":"test message"}`

Then:
- Consumer-1 inserts to PostgreSQL
- Consumer-2 caches to Redis
- EventBus emits → SSE pushes to UI
- UI calls GET /messages → displays new message

### 2. Verify Kafka topic
```bash
docker exec -it kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic messages-events \
  --from-beginning \
  --timeout-ms 5000
```
You'll see the JSON events flow through.

### 3. Verify Redis cache
```bash
docker exec -it redis redis-cli
LRANGE messages:created 0 -1    # all created payloads
GET message:1                   # cached message with id=1
```

### 4. Verify PostgreSQL
```bash
docker exec -it PostgresDB psql -U postgres -d helloworld -c "SELECT * FROM messages;"
```

---

## Observability

### Prometheus (http://localhost:9090)
- **Status → Targets** → see `backend:4000` as UP
- Query `api_requests_total` to see total request count
- Query `rate(api_requests_total[1m])` for req/sec

### Grafana (http://localhost:3001)
- Login: `admin` / `admin`
- Dashboard **"Full Stack Overview"** auto-provisioned
- Panels: Total Requests, Request Rate, Backend Up, Memory Usage, Event Loop Lag

---

## Key Takeaways

✅ **Event-driven** — all writes go through Kafka  
✅ **Multi-consumer** — same topic, different consumer groups, different destinations  
✅ **Real-time UI** — SSE push instead of polling  
✅ **Decoupled** — consumers are independent, can fail/recover separately  
✅ **Observable** — Prometheus/Grafana built-in  
✅ **Scalable** — Kafka guarantees ordering, consumers can be clustered  

---

## Advanced Next Steps

1. **Add consumer offset tracking** — track progress through the topic
2. **Dead Letter Queue (DLQ)** — handle messages that fail to process
3. **Message replay** — reprocess all messages from the beginning
4. **Exactly-once semantics** — prevent duplicate DB writes if consumer crashes
5. **Conditional SSE** — only push if data actually changed
6. **Multi-backend instances** — EventBus won't work; use Redis Pub/Sub or a true message broker
