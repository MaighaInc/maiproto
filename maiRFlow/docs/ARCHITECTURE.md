# ReceiptFlow AI — Architecture

## Overview

ReceiptFlow is a multi-tenant SaaS platform for AI-powered receipt management, bookkeeping automation, and accounting. It is designed for 10,000+ organizations and millions of receipts.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          Client Layer                            │
│   Next.js 15 (App Router) + React 19 + shadcn/ui + Tailwind     │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTPS / REST
┌──────────────────────────▼───────────────────────────────────────┐
│                       API Layer (apps/api)                       │
│   Express 4 + TypeScript 5.5 + Zod validation + JWT auth        │
│   Modules: auth, receipts, vendors, accounting, search,          │
│            reports, billing, approvals, webhooks                 │
└────────┬───────────────────────────────────────────┬────────────┘
         │ Prisma ORM                                │ BullMQ
┌────────▼──────────────┐              ┌─────────────▼────────────┐
│  PostgreSQL 16        │              │  Redis 7 (ioredis)       │
│  - public schema      │              │  - BullMQ job queues     │
│  - audit schema       │              │  - Rate limiting cache   │
│  - 40+ models         │              └──────────────────────────┘
│  - Row-level tenancy  │                           │
└───────────────────────┘              ┌────────────▼────────────┐
                                       │  Worker (apps/worker)   │
                                       │  BullMQ processors:     │
                                       │  - OCR                  │
                                       │  - Categorization       │
                                       │  - Journal entry        │
                                       │  - Notifications        │
                                       │  - Webhook delivery     │
                                       └─────────────────────────┘
```

## Package Structure

| Package | Purpose |
|---------|---------|
| `@receiptflow/database` | Prisma schema, client, seed |
| `@receiptflow/shared` | Types, errors, validators, constants, utils |
| `@receiptflow/auth` | JWT, password hashing, MFA, encryption |
| `@receiptflow/storage` | S3, Cloudflare R2, local storage |
| `@receiptflow/ai` | OpenAI, Claude, Gemini providers |
| `@receiptflow/ocr` | Textract, Document AI, Form Recognizer |
| `@receiptflow/accounting` | Journal entries, bank reconciliation |
| `@receiptflow/notifications` | SMTP, SendGrid, Resend, Slack |

## Security

- All secrets in environment variables, validated at startup via Zod
- JWT access tokens (15 min) + refresh token rotation with family-based reuse detection
- Passwords: scrypt (N=32768, r=8, p=1, keyLen=64)
- MFA secrets: AES-256-GCM encrypted at rest
- Multi-tenant data isolation: every DB record has `tenantId`; all queries are filtered
- Helmet, CORS allowlist, rate limiting on all API routes
- Stripe webhook signature verification
- Webhook delivery HMAC-SHA256 signatures

## Scalability

- Stateless API — scales horizontally behind a load balancer
- Worker processes scale independently per queue throughput
- PostgreSQL with connection pooling (PgBouncer recommended in production)
- Redis for job queues and caching
- S3/R2 for receipt file storage (no local disk in production)
