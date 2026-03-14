require("dotenv").config()

const express = require("express")
const userRoutes = require("./routes/userRoutes")
const errorHandler = require("./middleware/errorHandler")
const { connectRedis, enabled: redisEnabled } = require("./cache/cache")

const app = express()

app.use(express.json())

app.use("/api/users", userRoutes)

app.use(errorHandler)

const PORT = process.env.NODE_SERVER_PORT || 3000

async function validatePgBouncer(retries = 10, delayMs = 3000) {
  const { Client } = require('pg')
  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = new Client({
      host: 'pgbouncer',
      port: Number(process.env.PGBOUNCER_PORT),
      user: process.env.POSTGRES_DB_USER,
      password: process.env.POSTGRES_DB_PASSWORD,
      database: process.env.POSTGRES_DB,
      connectionTimeoutMillis: 3000
    })
    try {
      await client.connect()
      await client.end()
      console.log("[PgBouncer] Connected and healthy")
      return
    } catch (err) {
      console.warn(`[PgBouncer] Attempt ${attempt}/${retries} failed: ${err.message}`)
      if (attempt < retries) await new Promise(r => setTimeout(r, delayMs))
    }
  }
  console.error("[PgBouncer] ERROR: PGBOUNCER_ENABLED=true but PgBouncer is unreachable")
  console.error(`[PgBouncer] Host: pgbouncer:${process.env.PGBOUNCER_PORT}`)
  process.exit(1)
}

async function start() {
  if (process.env.PGBOUNCER_ENABLED === 'true') {
    await validatePgBouncer()
  }

  if (redisEnabled) {
    try {
      await connectRedis()
      console.log("[Redis] Connected and healthy")
    } catch (err) {
      console.error("[Redis] ERROR: REDIS_ENABLED=true but Redis is unreachable")
      console.error(`[Redis] Host: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`)
      console.error(`[Redis] ${err.message}`)
      process.exit(1)
    }
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

start()