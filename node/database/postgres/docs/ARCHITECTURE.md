# Database Architecture: PgBouncer + Replica + Redis Cache

## Table of Contents
1. [PgBouncer Workflow](#pgbouncer-workflow)
2. [Replica Setup Script](#replica-setup-script)
3. [End-to-End API Flow](#end-to-end-api-flow)
4. [Architecture Diagram](#architecture-diagram)
5. [Configuration](#configuration)
6. [Verification](#verification)

---

## PgBouncer Workflow

### Purpose
PgBouncer is a lightweight connection pooler that sits between the Node.js application and PostgreSQL:
- **Reuses idle connections** — doesn't create a new one per request
- **Multiplexes** many client connections over fewer server connections
- **Reduces load** on PostgreSQL by managing connection lifecycle
- Operates in **transaction mode** — releases connection after each transaction completes

### Architecture
```
nodeapi-dev (app)
    |
    v postgresql://postgres:postgres@pgbouncer:6432/devdb?pgbouncer=true
    |
PgBouncer (port 6432)
    |
    | connection pool
    | (max 20 connections by default)
    |
    v postgresql://postgres:postgres@postgresDB:5432/devdb
    |
PostgreSQL (port 5432)
    |
    +-----+-----+-----+
    |           |
    v           v
  Data      WAL Stream
  (tables)  (replication logs)
            |
            v
         postgresRepDB (replica)
         port 5432 (read-only)
```

### Connection Flow

#### 1. **Client Connection**
```
nodeapi connects to pgbouncer:6432 with credentials: postgres/postgres
```

#### 2. **Authentication (PgBouncer -> PostgreSQL)**
PgBouncer uses `auth_query` to fetch real credentials:
```sql
SELECT usename, passwd FROM pg_shadow WHERE usename='postgres'
```
- Connects to PostgreSQL as the `auth_user` (postgres)
- Fetches SCRAM hash from `pg_shadow` system table
- Verifies client password against hash
- If valid, routes client queries to PostgreSQL

#### 3. **Query Execution**
```
Client query -> PgBouncer -> PostgreSQL
(INSERT/UPDATE/DELETE/SELECT)
```

#### 4. **Connection Release**
After transaction completes:
```
Connection returned to pool (NOT closed)
Next client reuses same connection
```

### Configuration (pgbouncer.ini)

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
auth_file           = /etc/pgbouncer/userlist.txt
auth_user           = postgres
auth_query          = SELECT usename, passwd FROM pg_shadow WHERE usename=$1

pool_mode           = transaction
max_client_conn     = 1000
default_pool_size   = 20
min_pool_size       = 5
reserve_pool_size   = 5
```

### Environment Control

```bash
# Enable PgBouncer
PGBOUNCER_ENABLED=true
PGBOUNCER_PORT=6432

# PRIMARY_DATABASE_URL routes through pgbouncer
PRIMARY_DATABASE_URL="postgresql://postgres:postgres@pgbouncer:6432/devdb?pgbouncer=true&connection_limit=1"
```

When `PGBOUNCER_ENABLED=false`, connection goes directly to `postgresDB:5432` (no pooling).

---

## Replica Setup Script

### Purpose
The replica initialization script (`scripts/replica-setup.sh`) handles:
1. **Database cloning** — Copy primary's data to replica
2. **Replication setup** — Configure streaming replication
3. **Permission fixes** — Handle Docker volume ownership

### Script Execution

#### First Start (Empty Replica Data Directory)
```bash
#!/bin/bash

# 1. Fix permissions (volume mounted as root)
chown -R postgres:postgres $PGDATA
chmod 700 $PGDATA

# 2. Clone primary's data using pg_basebackup
pg_basebackup \
  -h postgresDB \
  -p 5432 \
  -U replicator \
  -D $PGDATA \
  -Fp -Xs -P -R

# 3. PostgreSQL creates:
#    - standy.signal  (marks this as a standby)
#    - recovery.signal + primary_conninfo (streaming replication config)

# 4. Start PostgreSQL in standby mode
exec gosu postgres postgres -c hot_standby=on
```

**Options explained:**
- `-h postgresDB` — Primary host
- `-U replicator` — Replication user (created in initdb)
- `-D $PGDATA` — Destination directory
- `-Fp` — Full backup in plain format
- `-Xs` — Stream WAL (binary logs) during backup
- `-P` — Progress reporting
- `-R` — Write recovery configuration automatically

#### Subsequent Starts (Data Already Exists)
```bash
# Script skips pg_basebackup
echo "[Replica] Data directory exists, skipping pg_basebackup."

# Just start PostgreSQL in standby mode
exec gosu postgres postgres -c hot_standby=on
```

### What Happens After Startup

```
PostgreSQL Replica Initialization Sequence:
|
+- 1. Verify data directory is valid
|
+- 2. Perform crash recovery (like normal PostgreSQL)
|     "database system was interrupted; last known up at..."
|
+- 3. Enter standby mode
|     "entering standby mode"
|
+- 4. Replay WAL (Write-Ahead Logs)
|     "redo starts at 0/2000028"
|     "completed backup recovery with redo LSN 0/2000028"
|
+- 5. Reach consistent state
|     "consistent recovery state reached at 0/2000250"
|
+- 6. Accept read-only connections
|     "database system is ready to accept read-only connections"
|
+- 7. Start streaming WAL from primary
      "started streaming WAL from primary at 0/3000000 on timeline 1"
      Replica continually receives new changes via WAL stream
```

### Replication User Setup

Created in `initdb/01_pgbouncer_user.sql`:
```sql
CREATE USER replicator WITH REPLICATION PASSWORD 'replicator';
```

Authenticated via `pg_hba.conf`:
```
host    replication     replicator      172.0.0.0/8             scram-sha-256
```

---

## End-to-End API Flow

### Scenario 1: Create User (POST /api/users)

```
+-------+
| POST  |
+---+---+
    |
    v
+----------+
| nodeapi  |
+----+-----+
     |
     v
+---------+
| Service |
+---------+
     |
     v
+---------+
| Prisma  |
+---------+
     |
     v
+----------+
| PgBouncer|
+----+-----+
     |
     v
+-----+
| PG  |
+-----+
```

**Flow:**
1. Client sends: `POST /api/users { "name": "john", "email": "john@test.com" }`
2. nodeapi receives request -> POST handler -> userController.createUser()
3. userService.createUser() -> primary_prisma.user.create({ data })
4. Prisma Client reads PGBOUNCER_ENABLED=true
5. Sets DATABASE_URL = postgresql://postgres:postgres@pgbouncer:6432/devdb?pgbouncer=true
6. Request: nodeapi:5501 -> pgbouncer:6432 -> postgresDB:5432
7. PgBouncer authentication:
   - Client connects: postgres/postgres
   - PgBouncer runs auth_query: SELECT usename, passwd FROM pg_shadow WHERE usename='postgres'
   - Fetches SCRAM hash from pg_shadow
   - Verifies password [OK]
   - Takes connection from pool
8. PostgreSQL:
   - INSERT INTO User(name, email) VALUES(...)
   - Updates data files
   - Writes to WAL
   - COMMIT
   - Returns: id=42, name='john', email='john@test.com'
9. PgBouncer returns result to nodeapi
10. userService: await cacheAppend("users:all", 300, user)
    - Redis: LPUSH users:all <user>
    - Sets TTL=300 seconds
11. userController: res.json(user)
12. HTTP 201 Created: { id: 42, name: 'john', email: '...', ... }

**In parallel:**
- PostgreSQL WAL file updated
- PRIMARY sends new WAL segment to REPLICA
- REPLICA applies INSERT to its copy
- Data available on replica immediately

### Scenario 2: Get All Users (GET /api/users) - Cache HIT

```
GET /api/users
    |
    v
userService.getUsers()
    |
    v cacheGetOrSet()
    |
    v
Redis GET "users:all" -> FOUND
    |
    v
Return cached [users...]  <-- INSTANT (< 1ms)
    |
    v
HTTP 200 OK [ { id: 1, ... }, { id: 42, ... } ]
```

### Scenario 3: Get All Users (GET /api/users) - Cache MISS

```
GET /api/users
    |
    v
userService.getUsers()
    |
    v cacheGetOrSet()
    |
    v
Redis GET "users:all" -> MISS
    |
    v
Call fallback: replica_prisma.user.findMany()
    |
    v
Prisma reads REPLICA_DATABASE_URL
    |
    v
postgresql://postgres:postgres@postgresRepDB:5432/devdb
    |
    v
Request: nodeapi:5501 -> postgresRepDB:5432 (direct, no pgbouncer)
    |
    v
PostgreSQL Replica (read-only standby):
- Verify: SELECT pg_is_in_recovery() -> TRUE
- Accept connection as read-only
- Execute: SELECT * FROM User
- Return all rows
    |
    v
cache.js: Store result in Redis
- SETEX "users:all" 300 <json>
    |
    v
Return users to app
    |
    v
HTTP 200 OK [ { id: 1, ... }, { id: 42, ... } ]

Next GET within 300s -> Cache HIT (Scenario 2)
```

### Scenario 4: Cache Invalidation (Update User)

```
PUT /api/users/42 { "name": "Jane" }
    |
    v
userService.updateUser(42, { name: "Jane" })
    |
    v
primary_prisma.user.update(...)  <- writes to primary via pgbouncer
    |
    v
PostgreSQL:
- UPDATE User SET name='Jane' WHERE id=42
- Updates data file
- Writes to WAL
- Streams to replica
    |
    v
cacheListUpdate("users:all", updated_user)
    -> Updates cached user in "users:all" list
    (doesn't delete whole cache, just updates that user)
    |
    v
cacheSet("user:42", updated_user)
    -> Updates individual user cache
    |
    v
HTTP 200 OK { id: 42, name: "Jane", ... }

Next GET /api/users -> Cache HIT with fresh data
```

---

## Architecture Diagram

```
                           CLIENT
                             |
                +----+-------+-------+
                |    |       |       |
             POST   PUT     GET    DELETE
            (write) (write) (read)  (delete)
                |    |       |       |
                +----+-------+-------+
                       |
                    nodeapi-dev
                       |
        +------+-------+-------+
        |      |       |       |
      Redis Prisma  Error  Cache
     (Cache) Client Handler Ops
        |     |  |      |
        |   +-+  +--+   |
        |   |      |    |
    Cache  Primary Replica
    ops    (writes) (reads)
    (app, DATABASE  DATABASE
    update,  URL      URL
    remove)  |        |
        |    |        |
        |    v        v
        |  pgbouncer  Direct
        |  (pooling)  Connection
        |    |        |
        |    v        v
        |  PostgresDB PostgresRepDB
        |  (primary)  (standby)
        |    |        |
        | (accepts   (read-only)
        |  writes)       |
        |    |           |
        |    +-----------+
        |         |
        +----+----+
             |
      Continuous sync
       via WAL logs
```

### Connection Routing Summary

```
Request Type       Route
--------           -----
INSERT/UPDATE      pgbouncer -> PostgresDB (primary)
DELETE             pgbouncer -> PostgresDB (primary)
SELECT (cached)    Redis (instant, no DB query)
SELECT (miss)      Direct -> PostgresRepDB (replica)
Cache ops          Redis client direct
```

---

## Configuration

### Environment Variables

All in `env_templates/.env.<env>`:

```bash
# Database
POSTGRES_DB_USER=postgres
POSTGRES_DB_PASSWORD=postgres
POSTGRES_DB=devdb  # Changes per env: testdb, demodb, proddb
POSTGRES_DB_PORT=5432
POSTGRES_REP_DB_PORT=5433  # Replica host port

# URLs
DATABASE_URL="postgresql://..."  # Legacy, not used by Prisma anymore
DIRECT_DATABASE_URL="..."        # For migrations (direct to primary)
PRIMARY_DATABASE_URL="..."       # App writes -> pgbouncer
REPLICA_DATABASE_URL="..."       # App reads -> replica

# PgBouncer
PGBOUNCER_ENABLED=true
PGBOUNCER_PORT=6432

# Redis
REDIS_ENABLED=false  # Set to true to enable caching
REDIS_HOST=app-redis
REDIS_PORT=6379
REDIS_TTL=300  # Cache lifetime in seconds
```

### Docker Compose Profiles

```bash
# Start only primary + app (minimal)
docker compose --profile dev up

# Start primary + app + pgbouncer (pooling)
docker compose --profile dev --profile pgbouncer up

# Start primary + app + pgbouncer + replica (full HA)
docker compose --profile dev --profile pgbouncer --profile replica up

# Start primary + app + pgbouncer + replica + redis (full + caching)
# (Requires REDIS_ENABLED=true in .env)
docker compose --profile dev --profile pgbouncer --profile redis --profile replica up
```

---

## Verification

### 1. Verify PgBouncer is Working

```bash
# Check pgbouncer logs
docker logs pgbouncer

# Expected output:
# LOG listening on 0.0.0.0:6432
# [when client connects]
# LOG C-0x...: devdb/postgres@... login attempt: db=devdb user=postgres
# S-0x...: new connection to server
```

### 2. Verify Replica Replication

```bash
# Check replica logs
docker logs PostgresRepDB

# Expected output:
# LOG entering standby mode
# LOG started streaming WAL from primary at 0/3000000 on timeline 1

# In replica PostgreSQL console
docker exec -it PostgresRepDB psql -U postgres -d devdb
devdb=# SELECT pg_is_in_recovery();
 pg_is_in_recovery
------------------
 t
(1 row)
```

### 3. Verify Cache Working

```bash
# Test GET (should cache)
curl http://localhost:5501/api/users

# Check Redis has cached data
docker exec -it app-redis redis-cli
127.0.0.1:6379> KEYS "users:*"
1) "users:all"
127.0.0.1:6379> LLEN users:all
(integer) 2
```

### 4. Verify Read-Write Separation

```bash
# Create user (writes to primary via pgbouncer)
curl -X POST http://localhost:5501/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"test","email":"test@test.com"}'

# Get users (reads from replica, cached in Redis)
curl http://localhost:5501/api/users

# Check both pgbouncer AND replica logs to see activity
docker logs pgbouncer | grep "login attempt"
docker logs PostgresRepDB | tail -20
```

---

## Troubleshooting

### PgBouncer Connection Failed
```
Error: could not create connection pool: Error: expected 'd' at position 3 in ...
```
**Solution:** Check `PRIMARY_DATABASE_URL` format and verify pgbouncer is healthy:
```bash
docker logs pgbouncer
```

### Replica Not Replicating
```
PostgresRepDB | LOG: could not connect to replication server
```
**Solution:** Verify replicator user exists and `pg_hba.conf` allows replication:
```sql
-- On primary
SELECT * FROM pg_stat_replication;
```

### Cache Not Working
```
GET /api/users returns fresh data every time
```
**Solution:** Verify Redis is running and `REDIS_ENABLED=true`:
```bash
docker logs app-redis
redis-cli PING  # Should return PONG
```

---

## Performance Notes

### Read Performance
- **Cache HIT (90% of reads)**: < 1ms (Redis)
- **Cache MISS**: 10-50ms (replica query + cache store)

### Write Performance
- **Primary write via pgbouncer**: 5-20ms (connection pooling overhead minimal)
- **Replica sync**: < 100ms (WAL streaming, near-synchronous)

### Connection Pool Efficiency
- **Without pgbouncer**: 100 requests = 100 connections to PostgreSQL
- **With pgbouncer**: 100 requests = 5-10 connections (pooled)
- **Memory saved**: 85-95% reduction in PostgreSQL memory footprint

---

## Production Checklist

- [ ] Set `PGBOUNCER_ENABLED=true` for all environments
- [ ] Set `REDIS_ENABLED=false` (enable only if needed)
- [ ] Verify replica replication in logs
- [ ] Monitor pgbouncer connection pool via `SHOW POOLS;`
- [ ] Set appropriate `REDIS_TTL` (300s default)
- [ ] Test failover: kill primary, verify app still works (writes fail, reads succeed from stale cache)
- [ ] Monitor WAL lag: `SELECT slot_name, restart_lsn FROM pg_replication_slots;`
