import { Request, Response, NextFunction } from 'express';
import { ClassConstructor } from 'class-transformer';
import { ClassValidationMiddleware } from './ClassValidationMiddleware';
import { ValidationMiddleware } from './ValidationMiddleware';
import { RegisterUserDto, UpdateUserDto } from '../../application/dtos/UserDto';
import {
  CreateTopicDto,
  UpdateTopicDto,
} from '../../application/dtos/TopicDto';
import {
  CreateResourceDto,
  UpdateResourceDto,
} from '../../application/dtos/ResourceDto';
import { FindPathDto } from '../../application/dtos/PathDto';
import {
  IdParamDto,
  PaginationDto,
  SearchDto,
  VersionParamDto,
  HierarchyQueryDto,
} from '../../application/dtos/CommonDto';

/**
 * Utility class that provides pre-configured validation middleware
 * for common use cases in the knowledge base system
 */
export class ValidationUtils {
  // Content type and sanitization middleware
  static readonly contentType = ClassValidationMiddleware.validateContentType;
  static readonly sanitize = ClassValidationMiddleware.sanitizeInput;

  // User validation middleware
  static readonly validateRegisterUser =
    ClassValidationMiddleware.validateBody(RegisterUserDto);
  static readonly validateUpdateUser =
    ClassValidationMiddleware.validateBody(UpdateUserDto);

  // Topic validation middleware
  static readonly validateCreateTopic =
    ClassValidationMiddleware.validateBody(CreateTopicDto);
  static readonly validateUpdateTopic =
    ClassValidationMiddleware.validateBody(UpdateTopicDto);

  // Resource validation middleware
  static readonly validateCreateResource =
    ClassValidationMiddleware.validateBody(CreateResourceDto);
  static readonly validateUpdateResource =
    ClassValidationMiddleware.validateBody(UpdateResourceDto);

  // Path validation middleware
  static readonly validateFindPath =
    ClassValidationMiddleware.validateParams(FindPathDto);

  // Common parameter validation middleware
  static readonly validateIdParam =
    ClassValidationMiddleware.validateParams(IdParamDto);
  static readonly validateVersionParam =
    ClassValidationMiddleware.validateParams(VersionParamDto);

  // Query parameter validation middleware
  static readonly validatePagination =
    ClassValidationMiddleware.validateQuery(PaginationDto);
  static readonly validateSearch =
    ClassValidationMiddleware.validateQuery(SearchDto);
  static readonly validateHierarchyQuery =
    ClassValidationMiddleware.validateQuery(HierarchyQueryDto);

  /**
   * Creates a complete validation chain for request body
   */
  static validateRequestBody<T extends object>(dtoClass: ClassConstructor<T>) {
    return [
      this.contentType,
      this.sanitize,
      ClassValidationMiddleware.validateBody(dtoClass),
    ];
  }

  /**
   * Creates a complete validation chain for request parameters
   */
  static validateRequestParams<T extends object>(
    dtoClass: ClassConstructor<T>
  ) {
    return [this.sanitize, ClassValidationMiddleware.validateParams(dtoClass)];
  }

  /**
   * Creates a complete validation chain for query parameters
   */
  static validateRequestQuery<T extends object>(dtoClass: ClassConstructor<T>) {
    return [this.sanitize, ClassValidationMiddleware.validateQuery(dtoClass)];
  }

  /**
   * Creates a validation chain for endpoints that need ID parameter validation
   */
  static validateIdEndpoint() {
    return [this.sanitize, this.validateIdParam];
  }

  /**
   * Creates a validation chain for endpoints that need both ID and body validation
   */
  static validateIdAndBody<T extends object>(dtoClass: ClassConstructor<T>) {
    return [
      this.contentType,
      this.sanitize,
      this.validateIdParam,
      ClassValidationMiddleware.validateBody(dtoClass),
    ];
  }

  /**
   * Creates a validation chain for search endpoints
   */
  static validateSearchEndpoint() {
    return [this.sanitize, this.validateSearch];
  }

  /**
   * Legacy validation methods for backward compatibility
   */
  static readonly legacy = {
    validateRequiredFields: ValidationMiddleware.validateRequiredFields,
    validateFields: ValidationMiddleware.validateFields,
    validateUrl: ValidationMiddleware.validateUrl,
    validateEmail: ValidationMiddleware.validateEmail,
    validateEnum: ValidationMiddleware.validateEnum,
  };
}

/**
 * Middleware factory for custom validation scenarios
 */
export class ValidationFactory {
  /**
   * Creates a custom validation middleware that combines multiple validators
   */
  static combine(
    ...middlewares: Array<
      (req: Request, res: Response, next: NextFunction) => void
    >
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      let index = 0;

      const runNext = (error?: any) => {
        if (error) {
          return next(error);
        }

        if (index >= middlewares.length) {
          return next();
        }

        const middleware = middlewares[index++];
        try {
          middleware(req, res, runNext);
        } catch (err) {
          next(err);
        }
      };

      runNext();
    };
  }

  /**
   * Creates conditional validation middleware
   */
  static conditional(
    condition: (req: Request) => boolean,
    middleware: (req: Request, res: Response, next: NextFunction) => void
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (condition(req)) {
        return middleware(req, res, next);
      }
      next();
    };
  }

  /**
   * Creates validation middleware that only runs for specific HTTP methods
   */
  static forMethods(
    methods: string[],
    middleware: (req: Request, res: Response, next: NextFunction) => void
  ) {
    return this.conditional(
      (req) =>
        methods.map((m) => m.toUpperCase()).includes(req.method.toUpperCase()),
      middleware
    );
  }
}
