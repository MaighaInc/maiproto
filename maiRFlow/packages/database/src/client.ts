import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: [
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
      ...(process.env['NODE_ENV'] === 'development'
        ? [{ level: 'query' as const, emit: 'event' as const }]
        : []),
    ],
  });
}

// Singleton pattern — prevents multiple connections in dev hot-reload
export const prisma: PrismaClient =
  process.env['NODE_ENV'] === 'production'
    ? createPrismaClient()
    : (global.__prismaClient ?? (global.__prismaClient = createPrismaClient()));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prisma as any;

p.$on('error', (e: { message: string; target: string }) => {
  logger.error({ err: e.message, target: e.target }, 'Prisma error');
});

p.$on('warn', (e: { message: string; target: string }) => {
  logger.warn({ msg: e.message, target: e.target }, 'Prisma warning');
});

if (process.env['NODE_ENV'] === 'development') {
  p.$on('query', (e: { query: string; duration: number }) => {
    logger.debug({ query: e.query, duration: e.duration }, 'Prisma query');
  });
}

export * from '@prisma/client';
