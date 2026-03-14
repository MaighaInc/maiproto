const { redisClient, connectRedis } = require("./redisClient")

const enabled = process.env.REDIS_ENABLED === "true"

async function cacheGet(key) {
  return enabled ? redisClient.get(key) : null
}

async function cacheSet(key, ttl, val) {
  if (enabled) await redisClient.setEx(key, ttl, val)
}

async function cacheDel(key) {
  if (enabled) await redisClient.del(key)
}

async function cacheAppend(key, ttl, item) {
  if (!enabled) return
  const cached = await redisClient.get(key)
  if (cached) {
    const list = JSON.parse(cached)
    list.push(item)
    await redisClient.setEx(key, ttl, JSON.stringify(list))
  }
}

async function cacheListUpdate(key, ttl, item) {
  if (!enabled) return
  const cached = await redisClient.get(key)
  if (cached) {
    const list = JSON.parse(cached)
    const updated = list.map(i => i.id === item.id ? item : i)
    await redisClient.setEx(key, ttl, JSON.stringify(updated))
  }
}

async function cacheListRemove(key, ttl, id) {
  if (!enabled) return
  const cached = await redisClient.get(key)
  if (cached) {
    const list = JSON.parse(cached)
    const filtered = list.filter(i => i.id !== id)
    await redisClient.setEx(key, ttl, JSON.stringify(filtered))
  }
}

async function cacheGetOrSet(key, ttl, fetchFn) {
  if (enabled) {
    const cached = await redisClient.get(key)
    if (cached) {
      console.log(`[Redis] Cache HIT — ${key}`)
      return JSON.parse(cached)
    }
  }
  const data = await fetchFn()
  if (data) await cacheSet(key, ttl, JSON.stringify(data))
  return data
}

module.exports = { cacheGet, cacheSet, cacheDel, cacheAppend, cacheListUpdate, cacheListRemove, cacheGetOrSet, connectRedis, enabled }
