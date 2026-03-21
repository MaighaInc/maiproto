# 05_fStack — Troubleshooting & Change Log

This document captures every issue hit during the initial bring-up, the root cause, and the exact fix applied.

---

## Issue 1 — Kafka failed to start (KRaft misconfiguration)

**Error:**
```
ConfigException: Missing required configuration "controller.listener.names" which has no default value
```

**Root cause:**
The docker-compose Kafka config was incomplete for KRaft (no-Zookeeper) mode. Missing required env vars, and the controller was pointed at port 9092 instead of a separate controller port.

**Fix — `docker-compose.yml`:**

Replaced the broken Kafka env block with a correct KRaft config borrowed from `03_kafka/docker-compose.yml`, adapting `KAFKA_ADVERTISED_LISTENERS` to use the Docker service name `kafka` instead of `localhost`:

```yaml
# Before (broken)
KAFKA_BROKER_ID: 1
KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092
KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
KAFKA_PROCESS_ROLES: broker,controller
KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9092   # wrong — controller needs separate port
KAFKA_NUM_PARTITIONS: 1
KAFKA_LOG_DIRS: /kafka/logs

# After (correct)
KAFKA_NODE_ID: 1
KAFKA_PROCESS_ROLES: broker,controller
KAFKA_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093
KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT
KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
```

Also corrected the volume path from `/kafka/logs` → `/var/lib/kafka/data` (correct path for `apache/kafka` image).

---

## Issue 2 — Backend crashed with `Cannot find module 'express'`

**Error:**
```
Error: Cannot find module 'express'
Require stack: [ '/app/server.js' ]
```

**Root cause:**
The docker-compose volume mount `- ./bend:/app` replaced the entire `/app` directory inside the container, including `node_modules` that were installed during `docker build`. The host folder had no `node_modules`.

**Fix — `docker-compose.yml`:**

Added an anonymous volume entry to protect `node_modules` from being overwritten by the host bind mount:

```yaml
# Before
volumes:
  - ./bend:/app

# After
volumes:
  - ./bend:/app
  - /app/node_modules    # preserves node_modules from the image layer
```

---

## Issue 3 — Backend crashed with `ECONNREFUSED` on PostgreSQL

**Error:**
```
Error: connect ECONNREFUSED 172.18.0.3:5432
```

**Root cause 1:** `depends_on: - postgres` only waits for the container to start, not for PostgreSQL to be ready and accepting connections.

**Root cause 2:** The healthcheck used `${POSTGRES_USER}` which is an env var not available on the Docker host where the healthcheck command is interpolated, resulting in a blank string.

**Fix — `docker-compose.yml`:**

Fixed the healthcheck to use the hardcoded user value, and changed `depends_on` to wait until the healthcheck passes:

```yaml
# Healthcheck — before
test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]

# Healthcheck — after
test: ["CMD-SHELL", "pg_isready -U postgres"]

# depends_on — before
depends_on:
  - postgres
  - kafka

# depends_on — after
depends_on:
  postgres:
    condition: service_healthy
  kafka:
    condition: service_healthy
```

---

## Issue 4 — Backend crashed with `KafkaJSProtocolError: UNKNOWN_TOPIC_OR_PARTITION`

**Error:**
```
KafkaJSProtocolError: This server does not host this topic-partition
```

**Root cause:**
The backend consumer tried to subscribe to `hello-topic` before Kafka had fully initialised and before the topic existed. There was also no Kafka healthcheck, so the backend started connecting to Kafka before it was ready.

**Fix 1 — `docker-compose.yml`:** Added a Kafka healthcheck:

```yaml
healthcheck:
  test: ["CMD-SHELL", "/opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092 > /dev/null 2>&1"]
  interval: 10s
  timeout: 10s
  retries: 10
  start_period: 30s
```

**Fix 2 — `bend/kafka.js`:** Added a Kafka admin client to create the topic before the consumer subscribes:

```js
// Before — subscribed immediately, topic may not exist
await consumer.subscribe({ topic: 'hello-topic', fromBeginning: true });

// After — create topic first via admin, then subscribe
const admin = kafka.admin();
await admin.connect();
await admin.createTopics({
  waitForLeaders: true,
  topics: [{ topic: 'hello-topic', numPartitions: 1, replicationFactor: 1 }],
});
await admin.disconnect();
// then connect producer, consumer, subscribe...
```

---

## Issue 5 — Grafana had no datasource or dashboard

**Symptom:** Grafana opened to a blank slate every restart. Datasource and dashboards had to be added manually via UI.

**Fix:** Added Grafana provisioning via config files mounted at startup:

```
grafana/
  provisioning/
    datasources/prometheus.yml   → auto-creates Prometheus datasource pointing at http://prometheus:9090
    dashboards/default.yml       → tells Grafana to load dashboard JSON from /var/lib/grafana/dashboards
  dashboards/
    fstack-overview.json         → pre-built dashboard (Total Requests, Request Rate, Backend Up, Memory, Event Loop Lag)
```

Updated `docker-compose.yml` to mount these:

```yaml
grafana:
  volumes:
    - ./grafana/provisioning:/etc/grafana/provisioning
    - ./grafana/dashboards:/var/lib/grafana/dashboards
```

---

## Issue 6 — Frontend failed with `unable to detect target browsers`

**Error:**
```
? We're unable to detect target browsers.
```

**Root cause:** `create-react-app` requires a `browserslist` field in `package.json` to know which browsers to compile for. It was missing entirely.

**Fix — `fend/package.json`:** Added `browserslist`:

```json
"browserslist": {
  "production": [">0.2%", "not dead", "not op_mini all"],
  "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
}
```

---

## Issue 7 — Update (Edit) missing from the UI

**Symptom:** Backend had a fully working `PUT /messages/:id` endpoint but the React frontend had no way to trigger it. Only Create, Read, Delete were available in the UI.

**Fix — `fend/src/app.js`:** Added inline edit state and UI:

- `editId` state tracks which message is being edited
- Clicking **Edit** on a row switches it to an input field with Save/Cancel buttons
- **Save** calls `PUT /messages/:id` then refreshes the list
- **Cancel** discards the edit without making any request
