import type { Request, Response, NextFunction } from 'express';
import { isAppError, isOperationalError } from '@receiptflow/shared/errors';
import type { ApiError } from '@receiptflow/shared/types/api';
import { logger } from '../config/logger.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (isAppError(err) && isOperationalError(err)) {
    const body: ApiError = {
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    };
    res.status(err.statusCode).json({ success: false, error: body });
    return;
  }

  logger.error({ err }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    } satisfies ApiError,
  });
}
