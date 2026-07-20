import pino from 'pino';

export const logger = pino({
  name: '@receiptflow/database',
  level: process.env['LOG_LEVEL'] ?? 'info',
});
