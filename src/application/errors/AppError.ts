/**
 * Base application error class
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;

  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error for invalid input data
 */
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly isOperational = true;

  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Unauthorized error for permission issues
 */
export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly isOperational = true;

  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Forbidden error for access denied
 */
export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly isOperational = true;

  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Conflict error for business rule violations
 */
export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly isOperational = true;

  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Internal server error for unexpected issues
 */
export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = false;

  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}
