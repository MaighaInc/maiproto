const { PrismaClient } = require('@prisma/client')

// When PgBouncer is enabled, override DATABASE_URL to route through PgBouncer
// DIRECT_DATABASE_URL always points to PostgreSQL directly (used by Prisma for migrations)
if (process.env.PGBOUNCER_ENABLED === 'true') {
  process.env.DATABASE_URL =
    `postgresql://${process.env.POSTGRES_DB_USER}:${process.env.POSTGRES_DB_PASSWORD}` +
    `@pgbouncer:${process.env.PGBOUNCER_PORT}/${process.env.POSTGRES_DB}?pgbouncer=true`
}

const prisma = new PrismaClient()

module.exports = prisma
