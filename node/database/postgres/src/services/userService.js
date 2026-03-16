const { primary_prisma, replica_prisma }  = require("../prismaClient")
const { cacheSet, cacheDel, cacheAppend, cacheListUpdate, cacheListRemove, cacheGetOrSet } = require("../cache/cache")

const TTL = Number(process.env.REDIS_TTL) || 300
const USERS_CACHE_KEY = "users:all"
const userKey = (id) => `user:${id}`

exports.createUser = async (data) => {
  const user = await primary_prisma.user.create({ data })
  await cacheAppend(USERS_CACHE_KEY, TTL, user)
  return user
}

exports.getUsers = async () => {
  return cacheGetOrSet(USERS_CACHE_KEY, TTL, () => replica_prisma.user.findMany())
}

exports.getUser = async (id) => {
  return cacheGetOrSet(userKey(id), TTL, () => replica_prisma.user.findUnique({ where: { id: Number(id) } }))
}

exports.updateUser = async (id, data) => {
  const user = await primary_prisma.user.update({ where: { id: Number(id) }, data })
  await cacheListUpdate(USERS_CACHE_KEY, TTL, user)
  await cacheSet(userKey(id), TTL, JSON.stringify(user))
  return user
}

exports.deleteUser = async (id) => {
  const user = await primary_prisma.user.delete({ where: { id: Number(id) } })
  await cacheListRemove(USERS_CACHE_KEY, TTL, user.id)
  await cacheDel(userKey(id))
  return user
}
