# ReceiptFlow AI

AI-powered receipt management platform. Upload receipts, extract data via OCR, categorise spend, generate journal entries, and get approval workflows — all in one monorepo.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [First-Time Setup](#first-time-setup)
   - [1. Clone & Install](#1-clone--install)
   - [2. Environment Files](#2-environment-files)
   - [3. Start Docker Infrastructure](#3-start-docker-infrastructure)
   - [4. Build Shared Packages](#4-build-shared-packages)
   - [5. Run Database Migrations](#5-run-database-migrations)
   - [6. Seed the Database](#6-seed-the-database)
   - [7. Start the Dev Servers](#7-start-the-dev-servers)
4. [Environment Variables Reference](#environment-variables-reference)
5. [Project Structure](#project-structure)
6. [Useful Commands](#useful-commands)
7. [Production Build](#production-build)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌──────────────┐     REST API      ┌──────────────┐
│  Next.js Web │ ────────────────► │  Express API │
│  (port 3000) │                   │  (port 3001) │
└──────────────┘                   └──────┬───────┘
                                          │ BullMQ jobs
                                   ┌──────▼───────┐
                                   │    Worker    │
                                   │  (BullMQ)    │
                                   └──────┬───────┘
                                          │
                     ┌────────────────────┼───────────────┐
                     ▼                    ▼               ▼
               PostgreSQL 16           Redis 7       Local Storage
               (port 5432)           (port 6379)    (./uploads)
```

| App / Package | Description |
|---|---|
| `apps/api` | Express REST API — auth, receipts, reports, webhooks |
| `apps/worker` | BullMQ background workers — OCR, AI categorisation, journal entries, notifications |
| `apps/web` | Next.js 15 frontend with NextAuth v5 |
| `packages/database` | Prisma schema, migrations, seed |
| `packages/auth` | Password hashing, JWT signing/verification |
| `packages/shared` | Zod validators, error types, shared utilities |
| `packages/storage` | Local / S3 / Cloudflare R2 storage abstraction |
| `packages/ai` | OpenAI / Anthropic / Gemini provider wrapper |
| `packages/ocr` | AWS Textract / Google Document AI / Azure Form Recognizer |
| `packages/accounting` | Journal entry generation |
| `packages/notifications` | Email (SMTP / SendGrid / Resend) |

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 22 | Check with `node --version` |
| npm | ≥ 10 | Bundled with Node 22 |
| Docker Desktop | any recent | Required for Postgres + Redis |
| Git | any | — |

> **Windows users:** all commands below are PowerShell. Run Docker Desktop before starting.

---

## First-Time Setup

### 1. Clone & Install

```bash
git clone <repo-url> maiRFlow
cd maiRFlow
npm install
```

`npm install` installs all workspace dependencies in one pass (Turborepo + npm workspaces).

---

### 2. Environment Files

You need **two** env files. Neither is committed to git.

#### `/.env.development`  ← API + Worker

Copy the example and edit as needed:

```bash
cp .env.example .env.development
```

**Minimum keys to change for local dev:**

| Variable | What it is | How to generate |
|---|---|---|
| `JWT_ACCESS_SECRET` | Signs access tokens — min 64 chars | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | Signs refresh tokens — must differ from access secret | same command |
| `ENCRYPTION_KEY` | 32-byte AES key — must be exactly 64 hex chars | same command |

Everything else (DB, Redis, SMTP, OCR, AI) has safe dev defaults in `.env.development`. You only need to fill in real API keys when you want OCR or AI features to work.

#### `/apps/web/.env.local`  ← Next.js only

Create this file:

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_SECRET=<same value as JWT_REFRESH_SECRET above>
```

`NEXTAUTH_SECRET` can be any random 32+ char string — it just needs to be consistent.

---

### 3. Start Docker Infrastructure

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts:
- **PostgreSQL 16** on `localhost:5432` (db: `receiptflow_dev`, user/pass: `receiptflow`)
- **Redis 7** on `localhost:6379`

Verify containers are healthy:

```bash
docker compose -f docker-compose.dev.yml ps
```

Both should show `healthy`. If not, wait a few seconds and check again.

To stop (preserving data):
```bash
docker compose -f docker-compose.dev.yml down
```

To wipe all data and start fresh:
```bash
docker compose -f docker-compose.dev.yml down -v
```

---

### 4. Build Shared Packages

The apps depend on compiled TypeScript from the shared packages. Build them once before first run (Turbo handles the dependency order automatically):

```bash
npm run build
```

Or build only the packages (faster):

```bash
cd packages/shared && npx tsc && cd ../..
cd packages/auth && npx tsc && cd ../..
cd packages/database && npx tsc && cd ../..
```

> After this, the `dev` servers use `tsx` to run TypeScript directly, so you don't need to rebuild on every change. You only need to rebuild shared packages if you change them.

---

### 5. Run Database Migrations

Applies all Prisma migrations to create the schema:

```bash
cd packages/database
dotenv -e ../../.env.development -- npx prisma migrate deploy
cd ../..
```

To check migration status:

```bash
cd packages/database
dotenv -e ../../.env.development -- npx prisma migrate status
```

> `migrate deploy` is idempotent — safe to run again if you're unsure.

---

### 6. Seed the Database

Populates a demo tenant, organisation, roles, permissions, and an admin user:

```bash
cd packages/database
dotenv -e ../../.env.development -- npx prisma db seed
cd ../..
```

**Demo credentials (after seed):**

| Field | Value |
|---|---|
| Email | `admin@demo.receiptflow.ai` |
| Password | `Admin123!` |
| Organization slug | `demo` |
| MFA code | leave blank |

> The seed is safe to re-run — it uses `upsert` so it won't create duplicates. If you change the password hashing parameters, re-running the seed will update the stored hash.

---

### 7. Start the Dev Servers

Open **three terminals** and run one command in each:

**Terminal 1 — API** (port 3001)
```bash
cd apps/api
dotenv -e ../../.env.development -- npx tsx watch --clear-screen=false src/main.ts
```

**Terminal 2 — Worker**
```bash
cd apps/worker
dotenv -e ../../.env.development -- npx tsx watch --clear-screen=false src/main.ts
```

**Terminal 3 — Web** (port 3000)
```bash
cd apps/web
npx next dev --turbo
```

Once all three are up:

- **Web app:** http://localhost:3000
- **API:** http://localhost:3001
- **Prisma Studio (optional):** `cd packages/database && dotenv -e ../../.env.development -- npx prisma studio`

Sign in with the demo credentials from step 6.

---

## Environment Variables Reference

### Shared — read by API and Worker (`/.env.development`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://receiptflow:receiptflow@localhost:5432/receiptflow_dev` | Postgres connection string |
| `REDIS_URL` | ✅ | `redis://localhost:6379` | Redis connection string |
| `STORAGE_PROVIDER` | ✅ | `local` | `local` / `s3` / `r2` |
| `STORAGE_LOCAL_BASE_PATH` | — | `./uploads` | Disk path for local file storage (API) |
| `LOCAL_STORAGE_DIR` | — | `./uploads` | Disk path for local file storage (Worker) |
| `EMAIL_PROVIDER` | — | `smtp` | `smtp` / `sendgrid` / `resend` |
| `OCR_PROVIDER` | — | `textract` | `textract` / `documentai` / `formrecognizer` |

### API-only (`/.env.development`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | ✅ | API HTTP port (default `3001`) |
| `JWT_ACCESS_SECRET` | ✅ | Secret for signing access tokens — min 64 chars |
| `JWT_REFRESH_SECRET` | ✅ | Secret for signing refresh tokens — min 64 chars, different from access |
| `JWT_ACCESS_EXPIRY` | — | Access token TTL (default `15m`) |
| `JWT_REFRESH_EXPIRY` | — | Refresh token TTL (default `7d`) |
| `ENCRYPTION_KEY` | ✅ | 32-byte key as 64 hex chars — for encrypting sensitive data at rest |
| `CORS_ORIGINS` | ✅ | Comma-separated allowed origins (e.g. `http://localhost:3000`) |
| `AI_PROVIDER` | — | `openai` / `anthropic` / `gemini` |
| `OPENAI_API_KEY` | — | Required if `AI_PROVIDER=openai` |
| `ANTHROPIC_API_KEY` | — | Required if `AI_PROVIDER=anthropic` |
| `STRIPE_SECRET_KEY` | — | Required for billing features |
| `STRIPE_WEBHOOK_SECRET` | — | Required for Stripe webhook verification |

### Worker-only (`/.env.development`)

| Variable | Required | Description |
|---|---|---|
| `AI_API_KEY` | — | Generic AI key used by worker (mirrors provider key above) |
| `OCR_CONCURRENCY` | — | Parallel OCR jobs (default `2` for dev) |
| `CATEGORIZATION_CONCURRENCY` | — | Parallel categorisation jobs (default `2`) |

### Web (`/apps/web/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Full URL of the API server (e.g. `http://localhost:3001`) |
| `NEXTAUTH_SECRET` | ✅ | Random secret for NextAuth session encryption — min 32 chars |

---

## Project Structure

```
maiRFlow/
├── apps/
│   ├── api/          # Express REST API
│   │   └── src/
│   │       ├── modules/   # auth, receipts, reports, webhooks …
│   │       ├── config/    # env validation, DI container, services
│   │       └── main.ts
│   ├── worker/       # BullMQ background workers
│   │   └── src/
│   │       ├── workers/   # ocr, categorise, journal, notify …
│   │       └── main.ts
│   └── web/          # Next.js 15 frontend
│       └── src/
│           ├── app/       # App Router pages
│           ├── components/
│           └── lib/       # auth.ts, api.ts, utils.ts
├── packages/
│   ├── database/     # Prisma schema + migrations + seed
│   ├── shared/       # Zod validators, error types, constants
│   ├── auth/         # Password hashing, JWT
│   ├── storage/      # Storage abstraction (local/S3/R2)
│   ├── ai/           # AI provider clients
│   ├── ocr/          # OCR provider clients
│   ├── accounting/   # Journal entry logic
│   └── notifications/# Email sending
├── .env.development  # API + Worker env (gitignored)
├── .env.example      # Template — copy to .env.development
├── docker-compose.dev.yml
├── turbo.json
└── package.json
```

---

## Useful Commands

```bash
# Install all dependencies
npm install

# Build everything (respects dependency order)
npm run build

# Start all dev servers concurrently via Turbo
npm run dev

# Run all tests
npm run test

# Type-check everything
npm run typecheck

# Format all files
npm run format

# Prisma — generate client after schema change
npm run db:generate

# Prisma — create a new migration (dev only)
cd packages/database
dotenv -e ../../.env.development -- npx prisma migrate dev --name <migration-name>

# Prisma — apply pending migrations
npm run db:migrate

# Prisma — seed database
npm run db:seed

# Prisma Studio — browse data in browser
cd packages/database
dotenv -e ../../.env.development -- npx prisma studio

# Clean all build outputs
npm run clean
```

---

## Production Build

```bash
# 1. Set real secrets in .env.production (never commit)
# 2. Build all packages and apps
npm run build

# 3. Run migrations against production DB
cd packages/database
dotenv -e ../../.env.production -- npx prisma migrate deploy

# 4. Start API
cd apps/api
dotenv -e ../../.env.production -- node dist/main.js

# 5. Start Worker
cd apps/worker
dotenv -e ../../.env.production -- node dist/main.js

# 6. Start Web
cd apps/web
npx next start
```

**Production secrets checklist:**

- [ ] `JWT_ACCESS_SECRET` — unique, ≥ 64 chars, generated with `crypto.randomBytes(32).toString('hex')`
- [ ] `JWT_REFRESH_SECRET` — unique, ≥ 64 chars, different from access secret
- [ ] `ENCRYPTION_KEY` — exactly 64 hex chars (32 bytes)
- [ ] `NEXTAUTH_SECRET` — unique, ≥ 32 chars
- [ ] `DATABASE_URL` — production Postgres connection string with SSL
- [ ] `REDIS_URL` — production Redis URL with auth if applicable
- [ ] `STORAGE_PROVIDER` — set to `s3` or `r2` with real credentials
- [ ] `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — live keys for billing
- [ ] `OPENAI_API_KEY` (or equivalent) — required for AI features
- [ ] `OCR_PROVIDER` + matching credentials — required for receipt parsing

---

## Troubleshooting

### `EADDRINUSE: address already in use :::3001`

Another process is using port 3001. Kill it:

```powershell
# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
```

```bash
# macOS / Linux
lsof -ti :3001 | xargs kill -9
```

### `Invalid credentials` on login

1. Confirm the seed ran successfully after the latest schema/hash changes:
   ```bash
   cd packages/database
   dotenv -e ../../.env.development -- npx prisma db seed
   ```
2. The seed uses `upsert` with `update: { passwordHash }` — re-running it always refreshes the hash.
3. Confirm the API is using the correct `.env.development` (look for `[INFO] API server started` on port 3001).

### `RangeError: Invalid scrypt params: memory limit exceeded`

The auth package uses `N: 32768, r: 8` which requires 32 MB. Both the auth package and seed explicitly set `maxmem: 64MB` to allow this. If you see this error in a plain `node -e` one-liner (outside tsx), the process may not have enough memory — run inside the app context instead.

### Prisma migration fails with "database does not exist"

Docker Postgres hasn't started yet or the DB name is wrong. Check:

```bash
docker compose -f docker-compose.dev.yml ps
# both postgres and redis should show "healthy"
```

The dev database name is `receiptflow_dev` (not `receiptflow`).

### TypeScript errors in `apps/api/src/config/services.ts`

`STORAGE_LOCAL_BASE_URL` is not in the env schema; the correct variable is `STORAGE_LOCAL_BASE_PATH`. The runtime fallback (`?? 'http://localhost:3001/uploads'`) means this is non-blocking for local dev.

### Web shows 404 for a sidebar page

All sidebar routes (`/approvals`, `/accounting`, `/search`, `/reports`, `/settings`, `/settings/organization`) have been created under `apps/web/src/app/(dashboard)/`. If you still see 404, restart the Next.js dev server.
