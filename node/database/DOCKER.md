# Docker Deployment

Run the User Management API using Docker Compose for a complete containerized environment.

## Prerequisites
- Docker
- Docker Compose

## Ports & Addresses

| Service | Port | Address |
|---------|------|---------|
| Node.js API | 5501 | `http://localhost:5501` |
| PostgreSQL | 5432 | `localhost:5432` |

- Only one environment runs at a time on a single machine
- The API connects to PostgreSQL internally using the service name `postgresDB` (Docker internal network)
- To switch environments: bring down current services, swap `.env`, then bring up the next environment

## Testing the Dockerized API

### Using Postman

- **POST** `/api/users` - Create a new user
- **PUT** `/api/users/:id` - Update an existing user
- **DELETE** `/api/users/:id` - Delete a user

### Using Web Client

- **GET** `/api/users` - Retrieve all users
- **GET** `/api/users/:id` - Retrieve a specific user

## Docker Compose Configuration

The `docker-compose.yml` base file defines two services:

1. **postgresDB**: PostgreSQL 18 database service
   - Port: 5432
   - Volume: `postgres_data` (persistent data storage)

2. **nodeapi**: Node.js application service
   - Port: 5501
   - Environment: `DATABASE_URL`, `NODE_SERVER_PORT`, `NODE_ENV` read from `.env`
   - Depends on: `postgresDB` service

> **Note**: Migrations run **automatically** on container startup for all environments. No separate migration step needed.

### First Time Setup

The Docker image needs to be **built once** before running any environment. You can go directly to **any environment** after cloning — you don't have to start with dev.

### Switching Environments

Only one environment runs at a time on a single machine. No image rebuild needed when switching.

1. **Stop** current → `docker compose down`
2. **Swap** `.env` → `copy env_templates\.env.<env> .env`
3. **Start** next → `docker compose -f docker-compose.yml -f docker-compose.<env>.yml up`

---

### Environments

#### **dev**

```bash
copy env_templates\.env.dev .env
docker compose build --no-cache
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

- Database: `devdb`

**Stop when done:**
```bash
docker compose down
```

---

#### **test**

```bash
copy env_templates\.env.test .env
docker compose build --no-cache          # skip if image already built
docker compose -f docker-compose.yml -f docker-compose.test.yml up --abort-on-container-exit
```

- Database: `testdb`

**Stop when done:**
```bash
docker compose down
```

---

#### **demo**

```bash
copy env_templates\.env.demo .env
docker compose build --no-cache          # skip if image already built
docker compose -f docker-compose.yml -f docker-compose.demo.yml up
```

- Database: `demodb`

**Stop when done:**
```bash
docker compose down
```

---

#### **prod**

```bash
copy env_templates\.env.prod .env
docker compose build --no-cache          # skip if image already built
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

- Database: `proddb`

**Stop when done:**
```bash
docker compose down
```

---

## Troubleshooting

- **Migration issues**: Ensure services are running and database is initialized
- **Connection refused**: Verify all containers are running using `docker compose ps`
- **Port already in use (5432)**: Local PostgreSQL on port 5532 may interfere — stop it with `net stop postgresql-x64-18`
- **Docker issues**: Run `docker compose down` then `docker compose build --no-cache` to reset
- **Permission denied**: Ensure Docker daemon is running
- **Image build failures**: Check logs with `docker compose logs`

## License

MIT
