import { Request, Response, NextFunction } from 'express';
import { User } from '../../domain/entities/User';
import { UserRole } from '../../domain/enums/UserRole';
import { UnauthorizedError } from '../../application/errors/AppError';
import { JwtService } from '../services/JwtService';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserRepository } from '../repositories/UserRepository';
import { FileDatabase } from '../database/FileDatabase';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Authentication middleware for validating user access using JWT tokens
 * Provides JWT-based authentication with database user validation
 */
export class AuthMiddleware {
  private static jwtService = new JwtService();
  private static userRepository: IUserRepository;

  /**
   * Initialize the user repository (call this during app startup)
   */
  static initialize(database: FileDatabase) {
    this.userRepository = new UserRepository(database);
  }
  /**
   * JWT authentication middleware
   * Validates JWT tokens and attaches authenticated user to request
   */
  static authenticate = async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.get('Authorization');

      if (!authHeader) {
        // For read operations, we might allow anonymous access
        // For write operations, authentication is required
        if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
          throw new UnauthorizedError('Authorization header required');
        }
        return next();
      }

      // Extract JWT token from header
      const token = this.jwtService.extractTokenFromHeader(authHeader);
      
      // Verify and decode JWT token
      const payload = this.jwtService.verifyAccessToken(token);

      // Fetch user from database to ensure they still exist and get latest data
      if (!this.userRepository) {
        throw new Error('AuthMiddleware not properly initialized. Call AuthMiddleware.initialize() first.');
      }

      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw new UnauthorizedError('User not found or has been deleted');
      }

      // Verify that user role hasn't changed since token was issued
      if (user.role !== payload.role) {
        throw new UnauthorizedError('User role has changed. Please login again.');
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          next(new UnauthorizedError(error.message));
        } else {
          next(error);
        }
      } else {
        next(new UnauthorizedError('Authentication failed'));
      }
    }
  };

  /**
   * Middleware to require authentication
   */
  static requireAuth = (
    req: Request,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    next();
  };

  /**
   * Middleware to require specific role
   */
  static requireRole = (requiredRole: UserRole) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (req.user.role !== requiredRole) {
        throw new UnauthorizedError(`${requiredRole} role required`);
      }

      next();
    };
  };

  /**
   * Middleware to require any of the specified roles
   */
  static requireAnyRole = (allowedRoles: UserRole[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new UnauthorizedError(
          `One of the following roles required: ${allowedRoles.join(', ')}`
        );
      }

      next();
    };
  };

  /**
   * Middleware for optional authentication
   * Attempts to authenticate but doesn't fail if no token is provided
   * Useful for endpoints that have different behavior for authenticated vs anonymous users
   */
  static optionalAuth = async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.get('Authorization');
      
      if (!authHeader) {
        return next(); // No token provided, continue without user
      }

      // Try to authenticate, but don't fail if token is invalid
      try {
        const token = this.jwtService.extractTokenFromHeader(authHeader);
        const payload = this.jwtService.verifyAccessToken(token);

        if (this.userRepository) {
          const user = await this.userRepository.findById(payload.userId);
          if (user && user.role === payload.role) {
            req.user = user;
          }
        }
      } catch {
        // Ignore authentication errors for optional auth
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get JWT service instance (for use in other parts of the application)
   */
  static getJwtService(): JwtService {
    return this.jwtService;
  }
}
