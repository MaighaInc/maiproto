import { Redis } from 'ioredis';
import { getConfig } from './env.js';
import { logger } from './logger.js';

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(getConfig().REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    _redis.on('error', (err: Error) => {
      logger.error({ err }, 'Redis connection error');
    });

    _redis.on('connect', () => {
      logger.info('Redis connected');
    });
  }
  return _redis;
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}
