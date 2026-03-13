# maiproto
Maigha Prototypes

# MaiProto - User Management API

A Node.js REST API with Prisma ORM for user management, featuring both local development and Docker-based deployments.

## Build Locally

Follow these steps to set up and run the project on your local machine after cloning:

### Prerequisites
- Node.js (v14 or higher)
- npm
- PostgreSQL (or your configured database)

### Setup Instructions

1. **Verify PostgreSQL Service is Running on Port 5532**
   ```bash
   netstat -ano | findstr :5532
   ```
   
   **If PostgreSQL is NOT running on port 5532:**
   
   - **Stop the PostgreSQL service** (Windows):
     ```bash
     net stop postgresql-x64-18
     ```
     *(Replace version number if different, e.g., postgresql-x64-14)*

   - **To change PostgreSQL port:**
     - Open PostgreSQL config file: `C:\Program Files\PostgreSQL\18\data\postgresql.conf`
     - Find the line `#port = 5432` and change it to `port = 5532`
     - Save the file and restart the service (see command below)

   - **Restart the PostgreSQL service**:
     ```bash
     net start postgresql-x64-18
     ```
   
2. **Verify PostgreSQL Password**
   Before setting up the environment, verify your PostgreSQL password:
   ```bash
   psql -U postgres -p 5532
   ```
   When prompted, enter your PostgreSQL password. Note this password for the next step.

2. **Create environment file**
   Create a `.env` file in the root directory with the following variables:
   
   **IMPORTANT**: Replace `YOUR_POSTGRES_PASSWORD` with the password you verified above.
  
   ```bash
   DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5532/testdb"
   NODE_ENV="development"
   PORT=3000
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run Prisma migrations**
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`

## Testing the API

### Using Postman

Test the following endpoints using Postman:

- **POST** `/api/users` - Create a new user
- **PUT** `/api/users/:id` - Update an existing user
- **DELETE** `/api/users/:id` - Delete a user

### Using Web Client

- **GET** `/api/users` - Retrieve all users
- **GET** `/api/users/:id` - Retrieve a specific user

## Dockerization

Run the project using Docker Compose for a complete containerized environment.

### Prerequisites
- Docker
- Docker Compose

### Build and Run

**Important**: All commands below must be executed in the `node/database/postgres` directory.

1. **Build the Docker image (without cache)**
   ```bash
   docker compose build --no-cache
   ```

2. **Start all services**
   ```bash
   docker compose up
   ```

   The API will be available at `http://localhost:3000`
   
   **Note on PostgreSQL Port**: Docker intentionally uses port **5432** (default PostgreSQL port) instead of **5532**. This is because the Docker container has its own isolated network, so port conflicts are avoided. The container-to-host port mapping is configured in `docker-compose.yml`.

3. **Run database migrations (in a new terminal)**
   Open a new terminal window and run:
   ```bash
   docker compose exec api npx prisma migrate dev --name init
   ```
   *(Keep the first terminal running with `docker compose up`)*

### Testing the Dockerized API

#### Using Postman

Test the following endpoints using Postman:

- **POST** `/api/users` - Create a new user
- **PUT** `/api/users/:id` - Update an existing user
- **DELETE** `/api/users/:id` - Delete a user

#### Using Web Client

- **GET** `/api/users` - Retrieve all users
- **GET** `/api/users/:id` - Retrieve a specific user

### Stop Services

```bash
docker compose down
```

## Ports & Addresses

### Local Development
| Service | Port | Address | Connection String |
|---------|------|---------|-------------------|
| Node.js API | 3000 | `http://localhost:3000` | N/A |
| PostgreSQL | 5532 | `localhost:5532` | `postgresql://postgres:PASSWORD@localhost:5532/testdb` |

### Docker/Containerized
| Service | Port (Host) | Port (Container) | Address | Connection String |
|---------|-------------|------------------|---------|-------------------|
| Node.js API | 3000 | 3000 | `http://localhost:3000` | N/A |
| PostgreSQL | 5432 | 5432 | `localhost:5432` | `postgresql://postgres:password@postgresDB:5432/testdb` |


## Docker Compose configurations
**docker-compose.dev.yml**
docker-compose.dev.yml file 
How to run

```
bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```
**features**
Hot reload
migration auto-apply
local source mounting

**docker-compose.test.yml**
docker-compose.test.yml file 
How to run

```
bash
docker compose -f docker-compose.yml -f docker-compose.test.yml up --abort-on-container-exit
```
**Pourpose**
CI Pipelines
Automatic DB creation
disposable database

**docker-compose.demo.yml**
docker-compose.demo.yml file 
How to run

```
bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml up 
```
**Pourpose**
QA
client demo
staging tetsing

**docker-compose.prod.yml**
docker-compose.prod.yml file 
How to run

```
bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d
```
**production Features**
Persistent volume
controlled migrations
stable database


**Important**: 
- In Docker, the API connects to PostgreSQL using the service name `postgresDB` (internal Docker network)
- From your local machine, you can access the API at `http://localhost:3000`
- The DATABASE_URL in `docker-compose.yml` uses `postgresDB:5432` for inter-container communication

## Troubleshooting

- **Migration issues**: Ensure your database URL is correct and the database exists
- **Port already in use**: Change the PORT variable in `.env`
- **Docker issues**: Run `docker compose down` and `docker compose build --no-cache` to reset

## License

MIT
