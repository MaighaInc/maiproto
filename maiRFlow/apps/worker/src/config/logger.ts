import pino from 'pino';

export const logger = pino(
  process.env['NODE_ENV'] !== 'production'
    ? { level: 'debug', transport: { target: 'pino-pretty', options: { colorize: true } } }
    : { level: 'info' },
);
