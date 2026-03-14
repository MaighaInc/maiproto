//            +-------------+
// Client --->|   Node API  |
//            +-------------+
//                  |
//                  |
//              Redis Cache
//                  |
//        +---------+--------+
//        |                  |
//    Cache Hit          Cache Miss
//        |                  |
//     Return            Prisma ORM
//        |                  |
//        |              PostgreSQL
//        |                  |
//        +------ Store in Redis

const { createClient } = require("redis")

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
})

redisClient.on("error", (err) => {
  console.error("Redis error:", err)
})

async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect()
  }
}

module.exports = {
  redisClient,
  connectRedis
}