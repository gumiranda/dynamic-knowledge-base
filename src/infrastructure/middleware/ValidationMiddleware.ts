import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './ErrorHandler';

export class ValidationMiddleware {
  static validateContentType(
    req: Request,
    _res: Response,
    next: NextFunction
  ): void {
    // Skip validation for GET requests and health check
    if (req.method === 'GET' || req.path === '/health') {
      return next();
    }

    // Validate Content-Type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('Content-Type');

      if (!contentType || !contentType.includes('application/json')) {
        throw new ValidationError('Content-Type must be application/json');
      }
    }

    next();
  }

  static validateRequiredFields(requiredFields: string[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
      const missingFields = requiredFields.filter(
        (field) =>
          req.body[field] === undefined ||
          req.body[field] === null ||
          req.body[field] === ''
      );

      if (missingFields.length > 0) {
        throw new ValidationError(
          `Missing required fields: ${missingFields.join(', ')}`
        );
      }

      next();
    };
  }
}
