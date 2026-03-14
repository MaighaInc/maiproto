require("dotenv").config()

const express = require("express")
const userRoutes = require("./routes/userRoutes")
const errorHandler = require("./middleware/errorHandler")
const { connectRedis, enabled } = require("./cache/cache")

const app = express()

app.use(express.json())

app.use("/api/users", userRoutes)

app.use(errorHandler)

const PORT = process.env.NODE_SERVER_PORT || 3000

async function start() {
  if (enabled) {
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