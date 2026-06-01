/**
 * Application-wide error hierarchy.
 *
 * All errors carry an HTTP status code, machine-readable code,
 * and optional structured details for client consumption.
 */

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  readonly isOperational: boolean = true;

  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// ─── 400 Bad Request ────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR';

  constructor(
    message: string,
    readonly fieldErrors?: Array<{ field: string; message: string }>,
  ) {
    super(message, fieldErrors);
  }
}

// ─── 401 Unauthorized ───────────────────────────────────────────────────────

export class AuthError extends AppError {
  readonly statusCode = 401;
  readonly code: string;

  constructor(message: string, code: AuthErrorCode = 'UNAUTHORIZED') {
    super(message);
    this.code = code;
  }
}

export type AuthErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'TOKEN_REVOKED'
  | 'SESSION_EXPIRED'
  | 'MFA_REQUIRED'
  | 'MFA_INVALID'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_SUSPENDED'
  | 'EMAIL_NOT_VERIFIED'
  | 'TOKEN_MISSING'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'TOKEN_REUSE';

// ─── 403 Forbidden ──────────────────────────────────────────────────────────

export class PermissionError extends AppError {
  readonly statusCode = 403;
  readonly code = 'PERMISSION_DENIED';

  constructor(
    message = 'You do not have permission to perform this action',
    readonly requiredPermission?: string,
  ) {
    super(message, requiredPermission ? { requiredPermission } : undefined);
  }
}

// ─── 404 Not Found ──────────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';

  constructor(resource: string, id?: string) {
    super(id ? `${resource} with id '${id}' not found` : `${resource} not found`);
  }
}

// ─── 409 Conflict ───────────────────────────────────────────────────────────

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = 'CONFLICT';
}

// ─── 422 Business Rule ──────────────────────────────────────────────────────

export class BusinessRuleError extends AppError {
  readonly statusCode = 422;
  readonly code: string;

  constructor(message: string, code = 'BUSINESS_RULE_VIOLATION', details?: unknown) {
    super(message, details);
    this.code = code;
  }
}

// ─── 429 Rate Limit ─────────────────────────────────────────────────────────

export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly code = 'RATE_LIMIT_EXCEEDED';

  constructor(message = 'Too many requests. Please slow down.') {
    super(message);
  }
}

// ─── 500 System Error ───────────────────────────────────────────────────────

export class SystemError extends AppError {
  readonly statusCode = 500;
  readonly code = 'INTERNAL_ERROR';
  readonly isOperational = false;

  constructor(message = 'An unexpected error occurred') {
    super(message);
  }
}

// ─── 503 Service Unavailable ────────────────────────────────────────────────

export class ServiceUnavailableError extends AppError {
  readonly statusCode = 503;
  readonly code = 'SERVICE_UNAVAILABLE';
}

// ─── Type guard ─────────────────────────────────────────────────────────────

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  return isAppError(error) && error.isOperational;
}
