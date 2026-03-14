# Docker Deployment

Uses `docker-compose.yml` with Docker Compose profiles.

## Prerequisites
- Docker
- Docker Compose

## Ports & Addresses

| Service | Port | Address |
|---------|------|---------|
| Node.js API | `NODE_SERVER_PORT` (default 5501) | `http://localhost:5501` |
| PostgreSQL | `POSTGRES_DB_PORT` (default 5432) | `localhost:5432` |
| Redis | `REDIS_PORT` (default 6379) | `localhost:6379` |
- Only one environment runs at a time on a single machine
- The API connects to PostgreSQL internally using the service name `postgresDB` and to Redis using `app-redis` (Docker internal network)

## How It Works

`docker-compose.yml` defines four services:

1. **postgresDB**: Always starts, regardless of profile
2. **redis**: Starts only when `--profile redis` is passed (controlled by `REDIS_ENABLED`)
3. **nodeapi-dev|test|demo|prod**: Four services, each tagged with a profile; only the matching one starts
4. **pgbackup**: Runs with all profiles (dev, test, demo, prod); creates a database backup every 24 hours to `./backups/`

`.env` must include all required variables — all `env_templates` files already include them:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Environment name (dev/test/demo/prod) |
| `POSTGRES_DB_USER` | Database user |
| `POSTGRES_DB_PASSWORD` | Database password |
| `POSTGRES_DB` | Database name |
| `POSTGRES_DB_PORT` | Database port (5432) |
| `POSTGRES_CONTAINER` | Container name for Docker exec mode (`PostgresDB`); empty = local mode |
| `DATABASE_URL` | Full Prisma connection string |
| `NODE_SERVER_PORT` | API server port (5501) |
| `REDIS_HOST` | Redis service hostname (`app-redis` — Docker internal) |
| `REDIS_PORT` | Redis port (6379) |
| `REDIS_TTL` | Cache TTL in seconds (300) |
| `REDIS_ENABLED` | Enable Redis cache (`true`/`false`) |

> **Note**: Migrations run **automatically** on container startup. No separate migration step needed.

> **Profile flag required**: Always include `--profile <env>` for `build`, `up`, and `down`. Add `--profile redis` when `REDIS_ENABLED=true` to also start the Redis container.

## Backups

The `pgbackup` service automatically creates compressed database dumps every 24 hours:
- **Location**: `./backups/` (host-mounted volume)
- **Naming**: `<POSTGRES_DB>_backup_YYYYMMDD_HHMMSS.dump`
- **Format**: PostgreSQL custom format (restorable with `pg_restore`)

For on-demand manual backups and restores, use the standalone scripts:

```bash
# Backup
./scripts/backup_db.sh env_templates/.env.dev ./backups

# Restore
./scripts/restore_db.sh env_templates/.env.dev ./backups/devdb_backup_20260313_141530.dump
```

Both scripts support **two modes** controlled by `POSTGRES_CONTAINER` in the env file:

| Mode | `POSTGRES_CONTAINER` | How it connects |
|------|----------------------|-----------------|
| Docker exec | `PostgresDB` (default) | Runs `pg_dump`/`pg_restore` inside the container |
| Local | _(empty)_ | Uses local `pg_dump`/`pg_restore` connecting to `localhost:POSTGRES_DB_PORT` |

Example filenames:
- `devdb_backup_20260313_141530.dump`
- `proddb_backup_20260313_141530.dump`


## Switching Environments

1. **Stop** current → `docker compose --profile <env> [--profile redis] down`
2. **Swap** `.env` → `copy env_templates\.env.<env> .env`
3. **Start** next → `docker compose --profile <env> [--profile redis] up`

> Include `--profile redis` only when `REDIS_ENABLED=true` in your `.env`.

---

## Environments

#### **dev**

```bash
copy env_templates\.env.dev .env
docker compose --profile dev build --no-cache           # skip if image already built
docker compose --profile dev up                        # Redis disabled
docker compose --profile dev --profile redis up        # Redis enabled
```

- Database: `devdb`
- Hot-reload via `nodemon`, uses `prisma migrate dev`

**Stop when done:**
```bash
docker compose --profile dev down
docker compose --profile dev --profile redis down      # if Redis was started
```

---

#### **test**

```bash
copy env_templates\.env.test .env
docker compose --profile test build --no-cache                          # skip if image already built
docker compose --profile test up --abort-on-container-exit             # Redis disabled
docker compose --profile test --profile redis up --abort-on-container-exit  # Redis enabled
```

- Database: `testdb`

**Stop when done:**
```bash
docker compose --profile test down
docker compose --profile test --profile redis down     # if Redis was started
```

---

#### **demo**

```bash
copy env_templates\.env.demo .env
docker compose --profile demo build --no-cache          # skip if image already built
docker compose --profile demo up                       # Redis disabled
docker compose --profile demo --profile redis up       # Redis enabled
```

- Database: `demodb`

**Stop when done:**
```bash
docker compose --profile demo down
docker compose --profile demo --profile redis down     # if Redis was started
```

---

#### **prod**

```bash
copy env_templates\.env.prod .env
docker compose --profile prod build --no-cache          # skip if image already built
docker compose --profile prod up -d                    # Redis disabled
docker compose --profile prod --profile redis up -d    # Redis enabled
```

- Database: `proddb`
- `restart: always` — container restarts automatically on failure

**Stop when done:**
```bash
docker compose --profile prod down
docker compose --profile prod --profile redis down     # if Redis was started
```

---

## Troubleshooting

- **Migration issues**: Ensure services are running and database is initialized
- **Connection refused**: Verify all containers are running using `docker compose ps`
- **Port already in use**: Local PostgreSQL may interfere — stop it with `net stop postgresql-x64-18`
- **Docker issues**: Run `docker compose --profile <env> down` then rebuild with `--no-cache`
- **Permission denied**: Ensure Docker daemon is running
- **Image build failures**: Check logs with `docker compose logs`

## License

MIT
