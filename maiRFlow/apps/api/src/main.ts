import { getConfig } from './config/env.js';
import { getRedis, closeRedis } from './config/redis.js';
import { createServices } from './config/services.js';
import { createApp } from './app.js';
import { logger } from './config/logger.js';
import { prisma } from '@receiptflow/database';

async function main(): Promise<void> {
  const env = getConfig();
  const redis = getRedis();
  const services = createServices(env);
  const app = createApp(env, services, redis);

  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info({ port: env.PORT, host: env.HOST, env: env.NODE_ENV }, 'API server started');
  });

  server.setTimeout(env.SERVER_TIMEOUT_MS);
  server.keepAliveTimeout = env.KEEP_ALIVE_TIMEOUT_MS;

  // --- Graceful shutdown ---
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down...');

    server.close(async () => {
      try {
        await prisma.$disconnect();
        await closeRedis();
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });

    // Force shutdown after SERVER_TIMEOUT_MS
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, env.SERVER_TIMEOUT_MS).unref();
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
