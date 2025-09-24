import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../application/errors/AppError';
import { ClassValidationMiddleware } from './ClassValidationMiddleware';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validator?: (value: any) => boolean;
  message?: string;
}

export class ValidationMiddleware {
  /**
   * @deprecated Use ClassValidationMiddleware.validateContentType instead
   * Validates Content-Type header for requests that require JSON
   */
  static validateContentType(
    req: Request,
    _res: Response,
    next: NextFunction
  ): void {
    return ClassValidationMiddleware.validateContentType(req, _res, next);
  }

  /**
   * Validates required fields in request body
   */
  static validateRequiredFields(requiredFields: string[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
      const missingFields = requiredFields.filter(
        (field) =>
          req.body[field] === undefined ||
          req.body[field] === null ||
          (typeof req.body[field] === 'string' && req.body[field].trim() === '')
      );

      if (missingFields.length > 0) {
        throw new ValidationError(
          `Missing required fields: ${missingFields.join(', ')}`
        );
      }

      next();
    };
  }

  /**
   * Advanced validation with custom rules
   */
  static validateFields(rules: ValidationRule[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
      const errors: string[] = [];

      for (const rule of rules) {
        const value = req.body[rule.field];

        // Check required fields
        if (
          rule.required &&
          (value === undefined || value === null || value === '')
        ) {
          errors.push(rule.message || `Field '${rule.field}' is required`);
          continue;
        }

        // Skip further validation if field is not provided and not required
        if (value === undefined || value === null) {
          continue;
        }

        // Type validation
        if (rule.type) {
          if (!this.validateType(value, rule.type)) {
            errors.push(
              rule.message ||
                `Field '${rule.field}' must be of type ${rule.type}`
            );
            continue;
          }
        }

        // String length validation
        if (rule.type === 'string' && typeof value === 'string') {
          if (rule.minLength && value.length < rule.minLength) {
            errors.push(
              rule.message ||
                `Field '${rule.field}' must be at least ${rule.minLength} characters long`
            );
          }
          if (rule.maxLength && value.length > rule.maxLength) {
            errors.push(
              rule.message ||
                `Field '${rule.field}' must be no more than ${rule.maxLength} characters long`
            );
          }
        }

        // Pattern validation
        if (rule.pattern && typeof value === 'string') {
          if (!rule.pattern.test(value)) {
            errors.push(
              rule.message || `Field '${rule.field}' format is invalid`
            );
          }
        }

        // Custom validator
        if (rule.validator && !rule.validator(value)) {
          errors.push(
            rule.message || `Field '${rule.field}' validation failed`
          );
        }
      }

      if (errors.length > 0) {
        throw new ValidationError(`Validation failed: ${errors.join(', ')}`);
      }

      next();
    };
  }

  /**
   * Validates URL format
   */
  static validateUrl(field: string = 'url') {
    return (req: Request, _res: Response, next: NextFunction): void => {
      const url = req.body[field];

      if (url && typeof url === 'string') {
        try {
          new URL(url);
        } catch {
          throw new ValidationError(`Field '${field}' must be a valid URL`);
        }
      }

      next();
    };
  }

  /**
   * Validates email format
   */
  static validateEmail(field: string = 'email') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return (req: Request, _res: Response, next: NextFunction): void => {
      const email = req.body[field];

      if (email && typeof email === 'string') {
        if (!emailPattern.test(email)) {
          throw new ValidationError(
            `Field '${field}' must be a valid email address`
          );
        }
      }

      next();
    };
  }

  /**
   * Validates enum values
   */
  static validateEnum(
    field: string,
    allowedValues: string[],
    message?: string
  ) {
    return (req: Request, _res: Response, next: NextFunction): void => {
      const value = req.body[field];

      if (value && !allowedValues.includes(value)) {
        throw new ValidationError(
          message ||
            `Field '${field}' must be one of: ${allowedValues.join(', ')}`
        );
      }

      next();
    };
  }

  /**
   * @deprecated Use ClassValidationMiddleware.sanitizeInput instead
   * Sanitizes input data
   */
  static sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
    return ClassValidationMiddleware.sanitizeInput(req, _res, next);
  }

  /**
   * Helper method to validate types
   */
  private static validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return (
          typeof value === 'object' && value !== null && !Array.isArray(value)
        );
      default:
        return true;
    }
  }

  /**
   * Helper method to sanitize objects recursively
   */
  private static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      // Basic XSS prevention - remove script tags and normalize whitespace
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .trim();
    }

    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = this.sanitizeObject(value);
    }
    return sanitized;
  }
}
