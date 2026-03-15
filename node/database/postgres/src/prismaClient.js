const { PrismaClient } = require('@prisma/client')

// When PgBouncer is enabled, override DATABASE_URL to route through PgBouncer
// DIRECT_DATABASE_URL always points to PostgreSQL directly (used by Prisma for migrations)
if (process.env.PGBOUNCER_ENABLED === 'true') {
  process.env.DATABASE_URL =
    `postgresql://${process.env.POSTGRES_DB_USER}:${process.env.POSTGRES_DB_PASSWORD}` +
    `@pgbouncer:${process.env.PGBOUNCER_PORT}/${process.env.POSTGRES_DB}?pgbouncer=true`
}

// Fallback to DATABASE_URL if PRIMARY/REPLICA URLs not explicitly set
const primaryUrl = process.env.PRIMARY_DATABASE_URL || process.env.DATABASE_URL
const replicaUrl = process.env.REPLICA_DATABASE_URL || primaryUrl

const primary = new PrismaClient({
  datasources: { db: { url: primaryUrl } }
})

const replica = new PrismaClient({
  datasources: { db: { url: replicaUrl } }
})

module.exports = { primary_prisma: primary, replica_prisma: replica }
