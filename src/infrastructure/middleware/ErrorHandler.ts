import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../application/errors/AppError';

export interface ErrorResponse {
  status: 'error';
  message: string;
  code?: string;
  details?: any;
  stack?: string;
  timestamp: string;
  path: string;
  method: string;
}

export class ErrorHandler {
  /**
   * Global error handling middleware
   * Handles all errors thrown in the application
   */
  static handle(
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction
  ): void {
    const timestamp = new Date().toISOString();
    const path = req.originalUrl || req.url;
    const method = req.method;

    // Log error details for debugging
    console.error('Error occurred:', {
      message: error.message,
      stack: error.stack,
      url: path,
      method,
      timestamp,
      body: req.body,
      params: req.params,
      query: req.query,
    });

    // Handle operational errors (AppError instances)
    if (error instanceof AppError) {
      const errorResponse: ErrorResponse = {
        status: 'error',
        message: error.message,
        code: error.constructor.name,
        timestamp,
        path,
        method,
      };

      // Include stack trace in development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
      }

      // Include cause if available
      if (error.cause) {
        errorResponse.details = {
          cause: error.cause.message,
        };
      }

      res.status(error.statusCode).json(errorResponse);
      return;
    }

    // Handle validation errors from express-validator or similar
    if (
      error.name === 'ValidationError' ||
      error.message.includes('validation')
    ) {
      const errorResponse: ErrorResponse = {
        status: 'error',
        message: error.message,
        code: 'ValidationError',
        timestamp,
        path,
        method,
      };

      if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
      }

      res.status(400).json(errorResponse);
      return;
    }

    // Handle unexpected errors
    const errorResponse: ErrorResponse = {
      status: 'error',
      message: 'Internal server error',
      code: 'InternalServerError',
      timestamp,
      path,
      method,
    };

    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = {
        originalMessage: error.message,
        name: error.name,
      };
      errorResponse.stack = error.stack;
    }

    res.status(500).json(errorResponse);
  }

  /**
   * Async error wrapper for route handlers
   * Catches async errors and passes them to error handler
   */
  static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * 404 Not Found handler for unmatched routes
   */
  static notFound(req: Request, _res: Response, next: NextFunction): void {
    const error = new Error(
      `Route not found: ${req.method} ${req.originalUrl}`
    );
    error.name = 'NotFoundError';
    next(error);
  }
}
