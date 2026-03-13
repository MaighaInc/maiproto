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

- Only one environment runs at a time on a single machine
- The API connects to PostgreSQL internally using the service name `postgresDB` (Docker internal network)

## How It Works

`docker-compose.yml` defines three services:

1. **postgresDB**: Always starts, regardless of profile
2. **nodeapi-dev|test|demo|prod**: Four services, each tagged with a profile; only the matching one starts
3. **pgbackup**: Runs with all profiles (dev, test, demo, prod); creates a database backup every 24 hours to `./backups/`

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

> **Note**: Migrations run **automatically** on container startup. No separate migration step needed.

> **Profile flag required**: Always include `--profile <env>` for `build`, `up`, and `down` — without it, Compose skips all profile-gated services.

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

1. **Stop** current → `docker compose --profile <env> down`
2. **Swap** `.env` → `copy env_templates\.env.<env> .env`
3. **Start** next → `docker compose --profile <env> up`

---

## Environments

#### **dev**

```bash
copy env_templates\.env.dev .env
docker compose --profile dev build --no-cache   # skip if image already built
docker compose --profile dev up
```

- Database: `devdb`
- Hot-reload via `nodemon`, uses `prisma migrate dev`

**Stop when done:**
```bash
docker compose --profile dev down
```

---

#### **test**

```bash
copy env_templates\.env.test .env
docker compose --profile test build --no-cache   # skip if image already built
docker compose --profile test up --abort-on-container-exit
```

- Database: `testdb`

**Stop when done:**
```bash
docker compose --profile test down
```

---

#### **demo**

```bash
copy env_templates\.env.demo .env
docker compose --profile demo build --no-cache   # skip if image already built
docker compose --profile demo up
```

- Database: `demodb`

**Stop when done:**
```bash
docker compose --profile demo down
```

---

#### **prod**

```bash
copy env_templates\.env.prod .env
docker compose --profile prod build --no-cache   # skip if image already built
docker compose --profile prod up -d
```

- Database: `proddb`
- `restart: always` — container restarts automatically on failure

**Stop when done:**
```bash
docker compose --profile prod down
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
