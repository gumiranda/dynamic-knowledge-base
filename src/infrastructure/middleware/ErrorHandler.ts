import { Request, Response, NextFunction } from 'express';

export abstract class AppError extends Error {
  abstract statusCode: number;
  abstract isOperational: boolean;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  statusCode = 400;
  isOperational = true;
}

export class NotFoundError extends AppError {
  statusCode = 404;
  isOperational = true;
}

export class UnauthorizedError extends AppError {
  statusCode = 401;
  isOperational = true;
}

export class ErrorHandler {
  static handle(
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction
  ): void {
    console.error('Error occurred:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      });
      return;
    }

    // Handle unexpected errors
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && {
        originalMessage: error.message,
        stack: error.stack,
      }),
    });
  }
}
