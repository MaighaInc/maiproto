const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: 6379,
  lazyConnect: true,
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err.message));

async function updateRedisCache(event) {
  if (event.type === 'message.created') {
    // No DB id available at produce time — track content in a list
    await redis.rpush('messages:created', event.content);
    console.log('Redis: tracked created message →', event.content);
  } else if (event.type === 'message.updated') {
    await redis.set(`message:${event.id}`, JSON.stringify({ id: event.id, content: event.content }));
    console.log(`Redis: cached updated message:${event.id}`);
  } else if (event.type === 'message.deleted') {
    await redis.del(`message:${event.id}`);
    console.log(`Redis: invalidated cache for message:${event.id}`);
  }
}

module.exports = { redis, updateRedisCache };
