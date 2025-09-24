import { Request, Response, NextFunction } from 'express';
import {
  validate,
  ValidationError as ClassValidationError,
} from 'class-validator';
import { plainToClass, ClassConstructor } from 'class-transformer';
import { ValidationError } from '../../application/errors/AppError';
import 'reflect-metadata';

/**
 * Enhanced validation middleware using class-validator
 */
export class ClassValidationMiddleware {
  /**
   * Validates request body against a DTO class
   */
  static validateBody<T extends object>(dtoClass: ClassConstructor<T>) {
    return async (
      req: Request,
      _res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        // Transform plain object to class instance with transformations
        const dto = plainToClass(dtoClass, req.body, {
          enableImplicitConversion: true,
        });

        // Validate the DTO
        const errors = await validate(dto, {
          whitelist: true, // Strip properties that don't have decorators
          forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
          skipMissingProperties: false,
          validationError: {
            target: false,
            value: false,
          },
        });

        if (errors.length > 0) {
          const errorMessages = this.formatValidationErrors(errors);
          throw new ValidationError(
            `Validation failed: ${errorMessages.join(', ')}`
          );
        }

        // Replace request body with validated and transformed DTO
        req.body = dto;
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Validates request parameters against a DTO class
   */
  static validateParams<T extends object>(dtoClass: ClassConstructor<T>) {
    return async (
      req: Request,
      _res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        // Transform plain object to class instance with transformations
        const dto = plainToClass(dtoClass, req.params, {
          enableImplicitConversion: true,
        });

        // Validate the DTO
        const errors = await validate(dto, {
          whitelist: true,
          forbidNonWhitelisted: true,
          skipMissingProperties: false,
          validationError: {
            target: false,
            value: false,
          },
        });

        if (errors.length > 0) {
          const errorMessages = this.formatValidationErrors(errors);
          throw new ValidationError(
            `Parameter validation failed: ${errorMessages.join(', ')}`
          );
        }

        // Replace request params with validated and transformed DTO
        req.params = dto as any;
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Validates request query parameters against a DTO class
   */
  static validateQuery<T extends object>(dtoClass: ClassConstructor<T>) {
    return async (
      req: Request,
      _res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        // Transform plain object to class instance with transformations
        const dto = plainToClass(dtoClass, req.query, {
          enableImplicitConversion: true,
        });

        // Validate the DTO
        const errors = await validate(dto, {
          whitelist: true,
          forbidNonWhitelisted: true,
          skipMissingProperties: false,
          validationError: {
            target: false,
            value: false,
          },
        });

        if (errors.length > 0) {
          const errorMessages = this.formatValidationErrors(errors);
          throw new ValidationError(
            `Query validation failed: ${errorMessages.join(', ')}`
          );
        }

        // Replace request query with validated and transformed DTO
        req.query = dto as any;
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Sanitizes input data to prevent XSS and other security issues
   */
  static sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
    try {
      if (req.body && typeof req.body === 'object') {
        req.body = this.sanitizeObject(req.body);
      }

      if (req.query && typeof req.query === 'object') {
        req.query = this.sanitizeObject(req.query);
      }

      if (req.params && typeof req.params === 'object') {
        req.params = this.sanitizeObject(req.params);
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validates Content-Type header for requests that require JSON
   */
  static validateContentType(
    req: Request,
    _res: Response,
    next: NextFunction
  ): void {
    // Skip validation for GET requests and health check
    if (req.method === 'GET' || req.path === '/health') {
      return next();
    }

    // Validate Content-Type for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('Content-Type');

      if (!contentType || !contentType.includes('application/json')) {
        throw new ValidationError('Content-Type must be application/json');
      }
    }

    next();
  }

  /**
   * Formats class-validator errors into readable messages
   */
  private static formatValidationErrors(
    errors: ClassValidationError[]
  ): string[] {
    const messages: string[] = [];

    for (const error of errors) {
      if (error.constraints) {
        messages.push(...Object.values(error.constraints));
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const childMessages = this.formatValidationErrors(error.children);
        messages.push(
          ...childMessages.map((msg) => `${error.property}.${msg}`)
        );
      }
    }

    return messages;
  }

  /**
   * Recursively sanitizes objects to prevent XSS and other security issues
   */
  private static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key as well
      const sanitizedKey = this.sanitizeString(key);
      sanitized[sanitizedKey] = this.sanitizeObject(value);
    }
    return sanitized;
  }

  /**
   * Sanitizes string values to prevent XSS attacks
   */
  private static sanitizeString(str: string): string {
    if (typeof str !== 'string') {
      return str;
    }

    return (
      str
        // Remove script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove javascript: protocol
        .replace(/javascript:/gi, '')
        // Remove on* event handlers
        .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
        // Remove data: protocol (except for data:image)
        .replace(/data:(?!image\/)/gi, 'data-blocked:')
        // Normalize whitespace
        .trim()
    );
  }
}
