import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment
const ENV = process.env.NODE_ENV || 'development';

// Logs directory
const logDir = path.join(__dirname, '../logs');

// Ensure logs directory exists
try {
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
    console.log(`Created logs directory at ${logDir}`);
  }
} catch (err) {
  console.error(`Failed to create logs directory at ${logDir}:`, err);
}

// Custom log levels
const customLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warning: 2,
    info: 3,
    debug: 4,
  },
  colors: {
    fatal: 'magenta',
    error: 'red',
    warning: 'yellow',
    info: 'green',
    debug: 'blue',
  },
};

// Apply colors for console
winston.addColors(customLevels.colors);

// Format to handle Error objects safely
const enumerateErrorFormat = winston.format((info) => {
  if (info instanceof Error) {
    return { ...info, message: info.stack };
  }
  return info;
});

// Daily rotating file transport
const rotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'debug',       // logs all levels
  maxSize: '20m',
  maxFiles: '14d',
  zippedArchive: true,
});

// Create base Winston logger
const baseLogger = winston.createLogger({
  levels: customLevels.levels,
  level: ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    enumerateErrorFormat(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.splat(),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`
    )
  ),
  transports: [
    new winston.transports.Console({
      format:
        ENV === 'development'
          ? winston.format.combine(
              winston.format.colorize({ all: true }),
              winston.format.printf(
                (info) => `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`
              )
            )
          : undefined,
      stderrLevels: ['error', 'fatal'],
    }),
    rotateTransport,
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// Capitalized method mapping
const logger = {};
Object.keys(customLevels.levels).forEach((level) => {
  const methodName = level.charAt(0).toUpperCase() + level.slice(1);
  logger[methodName] = (...args) => baseLogger[level](...args);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.Fatal(`Uncaught Exception: ${err.stack || err.message || err}`);
  process.exit(1); // optional: exit process after logging
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.Fatal(`Unhandled Rejection: ${reason.stack || reason}`);
  process.exit(1); // optional: exit process after logging
});

export default logger;