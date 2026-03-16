# maiproto: Architecture Evolution Journey

## 📚 Complete Evolution From Stage 1 → Stage 8

This document tracks the complete evolution of the `maiproto` project from a basic Node.js + Prisma + PostgreSQL application to a production-grade, fully containerized, multi-environment stack with caching, connection pooling, replication, and monitoring.

---

## 🎯 Evolution Overview

```
STAGE 1: Basic Application
        ↓
STAGE 2: Dockerization (Single Container)
        ↓
STAGE 3: Multiple Environments (Multiple Compose Files)
        ↓
STAGE 4: Profiles Pattern (Single Compose File)
        ↓
STAGE 5: Optional Redis Caching
        ↓
STAGE 6: Connection Pooling (PgBouncer)
        ↓
STAGE 7: PostgreSQL Streaming Replication
        ↓
STAGE 8: Monitoring & Observability Tools
```

---

## 📋 Stages Breakdown

| # | Stage | Focus Area | Key Tech | Status | Videos |
|---|-------|-----------|----------|--------|--------|
| **1** | **Basic Application** | Core app layer | Node.js, Prisma, PostgreSQL | ✅ Complete | 📹 Available |
| **2** | **Dockerization** | Single container | Docker, Docker Compose | ✅ Complete | 📹 Available |
| **3** | **Multiple Environments** | Separate compose files | YAML, env management | ✅ Complete | 📹 Available |
| **4** | **Profiles Pattern** | Single unified file | Docker profiles, YAML | ✅ Complete | 📹 Available |
| **5** | **Optional Redis Cache** | Caching layer | Redis, cache-aside pattern | ✅ Complete | 📹 Available |
| **6** | **Connection Pooling** | PgBouncer integration | PgBouncer, SCRAM-SHA-256 | ✅ Complete | 📹 Available |
| **7** | **Streaming Replication** | High availability | PostgreSQL WAL, pg_basebackup | ✅ Complete |  📹 Available  |
| **8** | **Monitoring Tools** | Observability | PgAdmin, PgHero, Prometheus, Grafana, postgres-exporter | ✅ Complete | - |

---

## 🔍 Detailed Stage Descriptions

### Stage 1: Basic Application
**Goal:** Build core application with database access

**What Gets Built:**
- Node.js Express API server (`src/server.js`)
- Prisma ORM setup (`prismaClient.js`)
- PostgreSQL database connection
- User model with CRUD operations
- Basic API routes (`src/routes/userRoutes.js`)

**Key Files:**
- `src/server.js` — Express entry point
- `src/prismaClient.js` — Prisma client instance
- `prisma/schema.prisma` — Data model definition
- `package.json` — Node dependencies

**Status:** ✅ Complete

---

### Stage 2: Dockerization
**Goal:** Containerize application and database

**What Gets Added:**
- PostgreSQL service in Docker container
- Node.js app containerized via Dockerfile
- Docker Compose for orchestration (2 services)
- Environment configuration via `.env` file
- Basic healthchecks for services

**Key Files:**
- `docker-compose.yml` v1 — 2-service setup (postgres + nodeapi)
- `Dockerfile` — Node.js container definition
- `.env` — Environment variables
- `.dockerignore` — Exclude unnecessary files

**Status:** ✅ Complete

---

### Stage 3: Multiple Environments
**Goal:** Support different configurations for dev, test, demo, prod

**What Gets Added:**
- `docker-compose.dev.yml` — Development environment
- `docker-compose.test.yml` — Testing environment  
- `docker-compose.demo.yml` — Demo environment
- `docker-compose.prod.yml` — Production environment
- Environment-specific `.env.dev`, `.env.test`, `.env.demo`, `.env.prod` files
- Different resource limits per environment (CPU, memory)
- Environment-specific database names and ports

**Key Differences Per Environment:**
```yaml
DEV:   database=devdb,   nodes=1,   minimal resources
TEST:  database=testdb,  nodes=1,   isolated testing
DEMO:  database=demodb,  nodes=1,   realistic demo
PROD:  database=proddb,  nodes=3,   HA with replicas
```

**Challenges Solved:**
- Managing 4 separate compose files (complex to maintain)
- Synchronizing configurations across files
- Different startup commands per environment

**Evolution Note:** Later evolved to Stage 4 (Profiles) to consolidate to single file

**Status:** ✅ Complete (evolved to Stage 4)

---

### Stage 4: Profiles Pattern
**Goal:** Consolidate multiple compose files into single unified file

**What Changes:**
- Single `docker-compose.yml` replaces multiple files
- Docker profiles: `[dev]`, `[test]`, `[demo]`, `[prod]`
- Environment selection via `.env` + `--profile <env>` flag
- Synced environment files in `env_templates/`

**Key Features:**
```bash
# Usage examples
docker compose --profile dev up              # Start dev environment
docker compose --profile prod up             # Start production
docker compose --profile test --profile pgbouncer up  # Test + pooling
```

**Benefits Over Stage 3:**
- ✅ Single source of truth (one docker-compose.yml)
- ✅ Cleaner orchestration
- ✅ Easier to add new services
- ✅ Better version control

**Key Files:**
- `docker-compose.yml` — Unified, consolidated
- `env_templates/.env.dev`, `.env.test`, `.env.demo`, `.env.prod` — Template files
- Copy template to `.env` to run specific environment

**Status:** ✅ Complete

---

### Stage 5: Optional Redis Caching
**Goal:** Add optional in-memory caching without code changes

**What Gets Added:**
- Redis service with `profiles: [redis]`
- Cache abstraction layer (`src/cache/cache.js`)
- Environment flag: `REDIS_ENABLED=true/false`
- Cache integration in `userService.js`
- Surgical cache updates (append, remove, update — not full invalidation)

**Cache-Aside Pattern:**
```
Request comes in
    ↓
Check Redis for cached data
    ↓
If found: RETURN (< 1ms)
    ↓
If miss: 
  → Query database
  → Store in Redis (with TTL)
  → Return result
```

**Key Features:**
- **300s TTL** by default (configurable via `REDIS_TTL` env var)
- **No-op when disabled** — All cache calls return null, app still works
- **Fully decoupled** — Service layer is cache-agnostic
- **Surgical updates** — Don't invalidate whole cache, update specific entries

**Cache Operations:**
- `cacheGet(key)` — Fetch from cache
- `cacheSet(key, ttl, value)` — Store in cache
- `cacheDel(key)` — Remove from cache
- `cacheAppend(key, ttl, item)` — Add item to list
- `cacheListUpdate(key, ttl, item)` — Update item in list
- `cacheListRemove(key, ttl, itemId)` — Remove item from list
- `cacheGetOrSet(key, ttl, fallback)` — Cache-aside pattern

**Key Files:**
- `src/cache/cache.js` — Redis abstraction
- `src/cache/redisClient.js` — Redis connection manager
- `src/services/userService.js` — Integrated cache calls

**Usage:**
```bash
# Enable Redis caching
docker compose --profile dev --profile redis up
# Set REDIS_ENABLED=true in .env
```

**Performance Gain:**
- **Cache HIT:** < 1ms (Redis)
- **Cache MISS:** 10-50ms (database query)

**Status:** ✅ Complete

---

### Stage 6: Connection Pooling (PgBouncer)
**Goal:** Reduce connection overhead via intelligent connection pooling

**What Gets Added:**
- PgBouncer service (`profilesL [pgbouncer]`)
- Connection pool configuration (`pgbouncer/pgbouncer.ini`)
- User registry (`pgbouncer/userlist.txt`)
- Authentication via `auth_query` (SCRAM-SHA-256)
- Dynamic DATABASE_URL override in `prismaClient.js`
- Retry logic in `server.js` for startup race conditions

**Connection Flow**
```
Client Connection Request
    ↓
pgbouncer receives connection (port 6432)
    ↓
pgbouncer authenticates as "auth_user" (postgres)
    ↓
pgbouncer connects to postgresDB (port 5432)
    ↓
pgbouncer executes auth_query on postgresSQL
"SELECT usename, passwd FROM pg_shadow WHERE usename=$1"
```
```bash
postgres=# SELECT usename, passwd FROM pg_shadow WHERE usename='postgres';
 usename  |                                                                passwd                                                                 
----------+---------------------------------------------------------------------------------------------------------------------------------------
 postgres | SCRAM-SHA-256$4096:vanEfe7WxPTjc/gaBhWYfQ==$dnFMNjBLtM7/EXdPBifl89nEeeSzzGrQ9Vd0WYmLLdc=:ZNVXMWs0mP101UQpcv6ca/2pbplq4Rbm1WZ+ZkAaBCc=
(1 row)

postgres=#
```
```
    ↓
PostgreSQL returns user password hash
    ↓
pgbouncer verifies client password against hash
    ↓
Connection approved/rejected
```

**How PgBouncer Works:**
```
Client Request
    ↓
PgBouncer receives connection (port 6432)
    ↓
Authenticates via auth_query to pg_shadow
    ↓
Takes connection from internal pool
    ↓
Sends query to PostgreSQL
    ↓
After transaction: returns connection to pool (not closed)
    ↓
Next client reuses same connection
```

**Key Configuration (pgbouncer.ini):**
```ini
[databases]
devdb  = host=postgresDB port=5432 dbname=devdb
testdb = host=postgresDB port=5432 dbname=testdb
demodb = host=postgresDB port=5432 dbname=demodb
proddb = host=postgresDB port=5432 dbname=proddb

[pgbouncer]
listen_addr         = 0.0.0.0
listen_port         = 6432
auth_type           = scram-sha-256
auth_user           = postgres
auth_query          = SELECT usename, passwd FROM pg_shadow WHERE usename=$1
pool_mode           = transaction       # Release after each transaction
max_client_conn     = 1000              # Max client connections
default_pool_size   = 20                # Connections per database
```

**Environment Control:**
```bash
PGBOUNCER_ENABLED=true       # Enable pooling
PGBOUNCER_PORT=6432          # Pool listens on this port
PRIMARY_DATABASE_URL="postgresql://...@pgbouncer:6432/..."
```

**Connection Routing:**
```
Writes/Updates: nodeapi → pgbouncer:6432 → PostgreSQL:5432
(Connection pooled, reused across requests)
```

**Performance Benefits:**
- **Connection Efficiency:** 85-95% reduction in PostgreSQL memory footprint
- **Without pooling:** 100 requests = 100 PostgreSQL connections
- **With pooling:** 100 requests = 5-10 PostgreSQL connections
- **Memory saved:** Significant (PostgreSQL allocates ~10MB per connection)

**Key Files:**
- `pgbouncer/pgbouncer.ini` — Pool configuration
- `pgbouncer/userlist.txt` — User credentials
- `initdb/01_pgbouncer_user.sql` — Initial user setup
- `src/prismaClient.js` — Dynamic DATABASE_URL override

**Usage:**
```bash
docker compose --profile dev --profile pgbouncer up
```

**Status:** ✅ Complete

---

### Stage 7: PostgreSQL Streaming Replication
**Goal:** Add read-write separation and high availability

**Why Replica? (Problems It Solves)**

| Problem | Without Replica | With Replica |
|---------|-----------------|--------------|
| **Too many reads overload primary** | All SELECT queries hit primary → Slow | Reads go to replica → Primary stays fast |
| **Primary fails = app down** | Single point of failure | Can failover to replica (manual) |
| **Database gets hot under load** | Primary CPU/RAM maxes out | Distribute load: primary = writes, replica = reads |
| **Can't upgrade without downtime** | Must stop everything | Replica can stay up during upgrades |
| **No data redundancy** | If primary disk fails, data lost | Replica has full copy of data |

**Simple Gain:** Separate **writes → Primary** from **reads → Replica** = Primary never gets overloaded by SELECT queries

**What Gets Added:**
- Replica PostgreSQL service (`profiles: [replica]`)
- WAL streaming replication (master → slave continuous sync)
- `pg_basebackup` initialization script (`scripts/replica-setup.sh`)
- Replicator user with replication privileges
- Dual Prisma clients (`primary_prisma` for writes, `replica_prisma` for reads)
- Read-write routing in `userService.js`



**Replication Architecture:**
```
Primary PostgreSQL (read-write)
    ↓ WAL streaming
    ↓ (continuous, near real-time)
    ↓
Replica PostgreSQL (read-only)

Writes: nodeapi → pgbouncer → primary
Reads:  nodeapi → Redis cache → replica (fallback)
Replication: primary → WAL logs → replica (< 100ms typically)
```

**Replica Setup Process:**
1. **First Start:** Clone primary's data using `pg_basebackup`
2. **Create Signal Files:** `standby.signal`, `recovery.signal`
3. **Configure Recovery:** `primary_conninfo` points to primary
4. **Fix Permissions:** Handle Docker volume ownership
5. **Start in Standby Mode:** `hot_standby=on` allows read-only queries
6. **Stream WAL:** Continuously receive binary logs from primary

**PostgreSQL Primary Configuration Options:**

The primary PostgreSQL is started with these flags (in docker-compose.yml):
```bash
postgres
  -c wal_level=replica
  -c max_wal_senders=10
  -c hot_standby=on
  -c hba_file=/etc/postgresql/pg_hba.conf
```

| Option | Purpose | What It Does |
|--------|---------|--------------|
| **`-c wal_level=replica`** | Enable transaction logging for replication | PostgreSQL writes all database changes to WAL (Write-Ahead Logs) first, creating executable transaction logs that can be streamed to replicas. Without this, no replication is possible. Enables `standby.signal` replication mode. |
| **`-c max_wal_senders=10`** | Allow up to 10 replica connections | Limits maximum simultaneous WAL sender processes (one per replica connection). Allows primary to serve up to 10 replicas simultaneously. Values: 0 (no replication) to N (max replicas), typically 5-20 for production. |
| **`-c hot_standby=on`** | Enable read-only queries on replica | Tells replica: "You can accept SELECT queries from applications while syncing from primary." Without this, replica only accepts data from primary, no client queries. Replica status: "in recovery" (syncing) but "accepting connections" (read-only). |
| **`-c hba_file=/etc/postgresql/pg_hba.conf`** | Use custom authentication rules | PostgreSQL reads `/etc/postgresql/pg_hba.conf` for client authentication rules. Specifies: which users can connect, from where, and via what method. Mounted as read-only volume in Docker. Enables secure SCRAM-SHA-256 authentication. |

**Example Flow:**
```
Configuration Set ───────────────────────────────────────┐
                                                          v
PostgreSQL Primary Starts                                 │
  ├─ wal_level=replica        ─ Enable WAL logging       │
  ├─ max_wal_senders=10       ─ Reserve 10 WAL channels  │
  ├─ hot_standby=on           ─ Tell replicas: OK to  ───┤ Result:
  │                             read from me              │ Primary
  └─ hba_file=...             ─ Load auth rules        ───┤ Ready for
                                                          │ Replication
Replica Connects                                          │
  ├─ Checks pg_hba.conf      ─ "Is replicator allowed?"  │
  ├─ Streams WAL logs        ─ Continuous sync          │
  └─ Accepts SELECT queries  ─ Read-only access        ───┘
```

**Key Script (scripts/replica-setup.sh):**
```bash
# Fix permissions
chown -R postgres:postgres $PGDATA
chmod 700 $PGDATA

# First start: clone primary
pg_basebackup -h postgresDB -U replicator -D $PGDATA -Fp -Xs -P -R

# Subsequent starts: just start in standby mode
exec gosu postgres postgres -c hot_standby=on
```

**Dual-Client Routing (prismaClient.js):**
```javascript
const primaryUrl = process.env.PRIMARY_DATABASE_URL  // writes
const replicaUrl = process.env.REPLICA_DATABASE_URL   // reads

const primary_prisma = new PrismaClient({ 
  datasources: { db: { url: primaryUrl } } 
})

const replica_prisma = new PrismaClient({ 
  datasources: { db: { url: replicaUrl } } 
})

module.exports = { primary_prisma, replica_prisma }
```

**Service Integration (userService.js):**
```javascript
// Writes go to primary
exports.createUser = async (data) => {
  const user = await primary_prisma.user.create({ data })
  return user
}

// Reads go to replica (cached if available)
exports.getUsers = async () => {
  return cacheGetOrSet("users:all", TTL, 
    () => replica_prisma.user.findMany()
  )
}
```

**Verification Commands:**
```bash
# Check replication status on primary
docker exec PostgresDB psql -U postgres -d devdb \
  -c "SELECT slot_name, restart_lsn FROM pg_replication_slots;"

# Check replica is in recovery mode
docker exec PostgresRepDB psql -U postgres -d devdb \
  -c "SELECT pg_is_in_recovery();"

# Tail replica logs for WAL streaming
docker logs PostgresRepDB | grep "started streaming WAL"
```

**Connection URLs:**
```bash
PRIMARY_DATABASE_URL="postgresql://...@pgbouncer:6432/devdb"
REPLICA_DATABASE_URL="postgresql://...@postgresRepDB:5432/devdb"
```

**Key Files:**
- `scripts/replica-setup.sh` — Replica initialization
- `initdb/pg_hba.conf` — Replication auth rules
- `initdb/01_pgbouncer_user.sql` — Replicator user creation
- `src/prismaClient.js` — Dual-client setup
- `src/services/userService.js` — Read-write routing

**Usage:**
```bash
# Full HA setup: pooling + replica
docker compose --profile dev --profile pgbouncer --profile replica up
```

**Status:** ✅ Complete

---

### Stage 8: Monitoring & Observability Tools
**Goal:** Add comprehensive monitoring, metrics, and diagnostics

**What Gets Added:**
- **PgAdmin** — PostgreSQL web UI for management/inspection
- **PgHero** — PostgreSQL performance insights (slow queries, index suggestions)
- **Prometheus** — Time-series metrics database
- **Grafana** — Visualization dashboards
- **PostgreSQL Exporter** — Scrapes PostgreSQL metrics for Prometheus

**Monitoring Stack Architecture:**
```
PostgreSQL (metrics)
    ↓ (scrapes)
postgres-exporter (9187)
    ↓
Prometheus (9090) [time-series DB]
    ↓
Grafana (3000) [dashboards]
```
---
```
PgAdmin (5050) [web UI]
    ↓
PostgreSQL (direct management)
```
---
```
PgHero (8081)
    ↓
PostgreSQL (performance analysis)
```
---

**Components:**

#### 1. PgAdmin
- **Port:** 5050
- **Purpose:** Web UI for PostgreSQL management
- **Features:**
  - Inspect databases, tables, schemas
  - Run SQL queries
  - Manage users and permissions
  - Monitor connections
- **Access:** http://localhost:5050
- **Default:** admin@local.dev / admin

#### 2. PgHero
- **Port:** 8081 (exposed as 8080 internally)
- **Purpose:** Performance insights for PostgreSQL
- **Features:**
  - Slow query detection
  - Index suggestions
  - Table bloat analysis
  - Missing indexes
- **Access:** http://localhost:8081
- **Config:** Uses `DIRECT_DATABASE_URL` env var

#### 3. Prometheus
- **Port:** 9090
- **Purpose:** Time-series metrics database
- **Features:**
  - Collects metrics from exporters
  - Stores metrics with timestamps
  - Query language (PromQL)
  - Alerting support
- **Access:** http://localhost:9090
- **Config:** `monitoring/prometheus.yml`

#### 4. Grafana
- **Port:** 3000
- **Purpose:** Visualization dashboards
- **Features:**
  - Charts, graphs, heatmaps
  - Prometheus datasource
  - Alert notifications
  - Custom dashboards
- **Access:** http://localhost:3000
- **Default:** admin / admin

**Grafana Setup Steps:**

**Step 1: Add Prometheus Data Source**
1. Open http://localhost:3000 (default: admin / admin)
2. Go to **Settings** → **Data Sources**
3. Click **Add Data Source**
4. Select **Prometheus**
5. Fill in:
   - **Name:** `Prometheus`
   - **Server URL:** `http://prometheus:9090`
6. Click **Save & Test** ✅

**Step 2: Import PostgreSQL Dashboard**
1. Go to **Dashboards** → **Import**
2. Enter **Dashboard ID:** `9628` (PostgreSQL)
3. Click **Load**
4. Select **Data Source:** `Prometheus` (created in Step 1)
5. Click **Import**
6. Dashboard loads with PostgreSQL metrics

**Result:**
- Real-time PostgreSQL metrics: connections, queries, cache hits, WAL activity
- Charts update every 15s (default Prometheus scrape interval)
- Shows primary database health and performance

#### 5. PostgreSQL Exporter
- **Port:** 9187
- **Purpose:** Scrapes PostgreSQL metrics for Prometheus
- **Features:**
  - Database size
  - Connection count
  - Transaction rates
  - Query performance metrics
- **Config:** `DATA_SOURCE_NAME` environment variable
- **Metrics URL:** http://localhost:9187/metrics

**Docker Compose Integration:**
```yaml
pgadmin:
  image: dpage/pgadmin4:latest
  ports:
    - "5050:80"
  profiles: [pgadmin]

pghero:
  image: ankane/pghero
  environment:
    DATABASE_URL: ${DIRECT_DATABASE_URL}
  ports:
    - "8081:8080"

prometheus:
  image: prom/prometheus
  volumes:
    - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana
  ports:
    - "3000:3000"
  depends_on:
    - prometheus

postgres-exporter:
  image: prometheuscommunity/postgres-exporter
  environment:
    DATA_SOURCE_NAME: "postgresql://postgres:postgres@postgresDB:5432/postgres?sslmode=disable"
  ports:
    - "9187:9187"
  depends_on:
    - postgresDB
```

**Usage:**
```bash
# Start all monitoring tools
docker compose --profile dev --profile pgadmin up

# Access UIs:
# - PgAdmin:   http://localhost:5050
# - PgHero:    http://localhost:8081
# - Prometheus: http://localhost:9090
# - Grafana:   http://localhost:3000
```

**Key Files:**
- `docker-compose.yml` — All monitoring service definitions
- `monitoring/prometheus.yml` — Prometheus config (scrape intervals, targets)

**Status:** ✅ Complete

---

## 🏗️ Combined Architecture (Stage 7 + Stage 8)

### Full Stack Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT REQUESTS                          │
│            (POST/PUT/GET/DELETE to API)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
       WRITE/DELETE             READ
         │                       │
         v                       v
    ┌─────────┐            ┌─────────────┐
    │ Service │            │Redis Cache  │
    │  Logic  │            │(300s TTL)   │
    └────┬────┘            └──────┬──────┘
         │                        │
         │ Always hits primary    │ Cache HIT
         │                        │ (< 1ms)
         v                        │
    ┌──────────┐                  │
    │PgBouncer │                  │
    │(pooling) │                  │
    └────┬─────┘                  │
         │                        │
         v                        │
    ┌─────────────────┐           │
    │PostgreSQL       │           │
    │Primary          │           │
    │(read-write)     │           │
    └────┬────────────┘           │
         │                        │
         │ WAL logs (replication) │
         │                        │ Cache MISS
         v                        │ (fallback)
    ┌─────────────────┐           │
    │PostgreSQL       │◄──────────┘
    │Replica          │
    │(read-only)      │
    └─────────────────┘
```

### Key Routes

| Route | Source | Via | Destination | Purpose |
|-------|--------|-----|-------------|---------|
| **Write** | nodeapi | PgBouncer:6432 | PostgreSQL Primary:5432 | INSERT/UPDATE with pooling |
| **Read (HIT)** | nodeapi | Redis | Cache | Sub-millisecond response |
| **Read (MISS)** | nodeapi | Direct | PostgreSQL Replica:5432 | Query with fallback |
| **Replication** | Primary | WAL Stream | Replica | Continuous sync |
| **Metrics** | postgres-exporter | HTTP | Prometheus | Collect DB metrics |
| **Visualization** | Grafana | PromQL | Prometheus | Dashboard rendering |

---

## 🚀 How to Use

### Quick Start (Stage 4 - Profiles)
```bash
cd d:\workspace\maiproto\node\database\postgres

# Copy environment template
cp env_templates/.env.dev .env

# Start development environment
docker compose --profile dev up
```

### Production-Grade (Stage 7 - Full HA)
```bash
# Start with connection pooling + replication
docker compose --profile prod --profile pgbouncer --profile replica up

# Or with caching
docker compose --profile prod --profile pgbouncer --profile replica --profile redis up
```

### Full Observability (Stage 7 + Stage 8)
```bash
# Start everything: app + pooling + replica + caching + monitoring
docker compose --profile dev --profile pgbouncer --profile replica --profile redis --profile pgadmin up

# Access UIs:
# - App API:    http://localhost:5501
# - PgAdmin:    http://localhost:5050
# - PgHero:     http://localhost:8081
# - Prometheus: http://localhost:9090
# - Grafana:    http://localhost:3000
```

### Enable/Disable Features
```bash
# In .env file

# Connection pooling
PGBOUNCER_ENABLED=true

# Caching
REDIS_ENABLED=true

# All env configurations
POSTGRES_DB=devdb
POSTGRES_DB_USER=postgres
POSTGRES_DB_PASSWORD=postgres
PGBOUNCER_PORT=6432
REDIS_TTL=300
```

---

## 📊 Performance Summary

| Component | Stage | Improvement | Impact |
|-----------|-------|-------------|--------|
| **Redis Cache** | 5 | 300x faster (cache HIT) | < 1ms vs 10-50ms |
| **Connection Pooling** | 6 | 90% memory reduction | 100 requests = 5-10 connections |
| **Replica Reads** | 7 | Read scaling | Distribute queries, primary focus on writes |
| **Monitoring** | 8 | Full observability | Identify bottlenecks, optimize queries |

---

## 🔧 Configuration Reference

### Environment Variables
```bash
# Database
POSTGRES_DB_USER=postgres
POSTGRES_DB_PASSWORD=postgres
POSTGRES_DB=devdb
POSTGRES_DB_PORT=5432
POSTGRES_REP_DB_PORT=5433

# URLs
PRIMARY_DATABASE_URL="postgresql://..."
REPLICA_DATABASE_URL="postgresql://..."
DIRECT_DATABASE_URL="postgresql://..."

# PgBouncer
PGBOUNCER_ENABLED=true/false
PGBOUNCER_PORT=6432

# Redis
REDIS_ENABLED=true/false
REDIS_HOST=app-redis
REDIS_PORT=6379
REDIS_TTL=300

# Node.js
NODE_ENV=dev/test/demo/prod
NODE_SERVER_PORT=5501
```

### Docker Profiles
```bash
--profile dev           # Development environment
--profile test          # Testing environment
--profile demo          # Demo environment
--profile prod          # Production environment
--profile pgbouncer     # Connection pooling
--profile replica       # Streaming replication
--profile redis         # In-memory caching
--profile pgadmin       # PostgreSQL web UI
```

---

## 📁 Key Files Organization

```
node/database/postgres/
├── docker-compose.yml          # Unified orchestration (all services, profiles)
├── Dockerfile                  # Node.js app container
├── ARCHITECTURE.md             # Detailed architecture documentation
├── EVOLUTION_README.md         # This file
│
├── src/
│   ├── server.js              # Express app + startup validation
│   ├── prismaClient.js        # Dual-client setup (primary/replica)
│   ├── cache/
│   │   ├── cache.js           # Redis abstraction (cache-aside)
│   │   └── redisClient.js     # Redis connection manager
│   ├── services/
│   │   └── userService.js     # Business logic with read-write routing
│   ├── controllers/
│   │   └── userController.js  # API request handlers
│   ├── routes/
│   │   └── userRoutes.js      # API route definitions
│   └── middleware/
│       └── errorHandler.js    # Prisma error mapping to HTTP codes
│
├── prisma/
│   ├── schema.prisma          # Data model (User table)
│   └── migrations/            # Database migration history
│
├── pgbouncer/
│   ├── pgbouncer.ini          # Connection pool configuration
│   └── userlist.txt           # User credentials registry
│
├── initdb/
│   ├── 01_pgbouncer_user.sql # Replicator user creation
│   └── pg_hba.conf            # Client authentication config
│
├── scripts/
│   ├── replica-setup.sh       # Replica initialization (pg_basebackup, recovery)
│   ├── backup_db.sh           # Database backup automation
│   └── restore_db.sh          # Database restore from backup
│
├── monitoring/
│   └── prometheus.yml         # Prometheus scrape config
│
├── env_templates/
│   ├── .env.dev              # Development template
│   ├── .env.test             # Testing template
│   ├── .env.demo             # Demo template
│   └── .env.prod             # Production template
│
├── backups/                   # Database backup storage
└── package.json              # Node.js dependencies
```

---

## ✅ Completion Status

| Stage | Component | Status | Notes |
|-------|-----------|--------|-------|
| 1 | Basic App | ✅ Complete | Node.js + Prisma + PostgreSQL |
| 2 | Docker | ✅ Complete | Containerized setup |
| 3 | Multi-Env | ✅ Complete | Multiple compose files (evolved to Stage 4) |
| 4 | Profiles | ✅ Complete | Single unified docker-compose.yml |
| 5 | Redis Cache | ✅ Complete | Optional caching, REDIS_ENABLED flag |
| 6 | PgBouncer | ✅ Complete | Connection pooling, PGBOUNCER_ENABLED flag |
| 7 | Replica | ✅ Complete | Streaming replication, primary-replica setup |
| 8 | Monitoring | ✅ Complete | PgAdmin, PgHero, Prometheus, Grafana, postgres-exporter |

**Overall Status:** 🎉 **All 8 Stages Complete & Production-Ready**

---

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Detailed architecture guide with workflows, verification, troubleshooting
- **[docker-compose.yml](./docker-compose.yml)** — Service definitions and configurations
- **[EVOLUTION_README.md](./EVOLUTION_README.md)** — This document (evolution journey)

---

## 🎓 Learning Path

**Recommended Study Order:**
1. Start Stage 1-2 (basic app + docker)
2. Move to Stage 4 (profiles pattern)
3. Understand Stage 5 (caching benefits)
4. Learn Stage 6 (connection pooling mechanics)
5. Deep dive Stage 7 (replication, high availability)
6. Wrap up Stage 8 (monitoring & observability)

**For Each Stage:**
- Read the stage description above
- Check the docker-compose.yml for service definitions
- Review key files listed
- Run with appropriate profiles
- Verify startup logs

---

## 🤝 Contributing

To extend this architecture:
1. Choose a stage to build upon
2. Update docker-compose.yml with new service
3. Add environment variables to env_templates/
4. Update this README with new stage
5. Document in ARCHITECTURE.md

---

## 📞 Support

For issues or questions:
1. Check ARCHITECTURE.md troubleshooting section
2. Review logs: `docker logs <service-name>`
3. Verify environment variables are set
4. Ensure profiles match required services

---

**Last Updated:** March 16, 2026  
**Version:** 8.0 (All stages complete)  
**Status:** Production-Ready ✅
