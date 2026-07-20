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
- Local: See [node/database/LOCAL.md](node/database/LOCAL.md) for setup instructions
- Docker: See [node/database/DOCKER.md](node/database/DOCKER.md) for Docker deployment

### 2. ReceiptFlow AI / maiRFlow (Turborepo monorepo)

AI-powered receipt management platform. Upload receipts, extract data via OCR, categorise spend, generate journal entries, and get approval workflows.

**Location**: `maiRFlow/`

**Stack**:
- Runtime: Node.js, TypeScript
- Web: Next.js
- API: Express
- Worker: BullMQ
- Monorepo: Turborepo

**Quick Start**: See [maiRFlow/README.md](maiRFlow/README.md) for full setup instructions.

## Getting Started

Each prototype has its own README with detailed setup and deployment instructions. Navigate to the prototype's directory to get started.

## License

MIT
