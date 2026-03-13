# maiproto

Maigha Prototypes - A collection of prototype projects demonstrating various technologies and architectures.

## Available Prototypes

### 1. User Management API (Node.js + PostgreSQL)

A full-stack REST API prototype built with Node.js and Prisma ORM for managing users. Features both local development and Docker-based deployments.

**Location**: `node/database/postgres/`

**Stack**:
- Runtime: Node.js 20
- ORM: Prisma
- Database: PostgreSQL 18
- Framework: Express.js
- Deployment: Docker & Docker Compose

**Features**:
- CRUD operations for user management
- Local development with hot-reload (nodemon)
- Containerized deployment with Docker Compose
- Prisma migrations for schema management
- RESTful API endpoints

**Quick Start**:
- Local: See [node/database/LOCAL.md](node/database/postgres/README.md) for setup instructions
- Docker: See [node/database/DOCKER.md](node/database/postgres/README.md) for Docker deployment

## Getting Started

Each prototype has its own README with detailed setup and deployment instructions. Navigate to the prototype's directory to get started.

## License

MIT
