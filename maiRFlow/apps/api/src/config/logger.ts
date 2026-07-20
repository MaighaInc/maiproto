import pino from 'pino';
import { getConfig } from './env.js';

export const logger = pino({
  level: getConfig().NODE_ENV === 'production' ? 'info' : 'debug',
  ...(getConfig().NODE_ENV !== 'production'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {}),
});
