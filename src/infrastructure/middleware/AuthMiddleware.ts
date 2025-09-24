import { Request, Response, NextFunction } from 'express';
import { User } from '../../domain/entities/User';
import { UserRole } from '../../domain/enums/UserRole';
import { UnauthorizedError } from '../../application/errors/AppError';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Authentication middleware for validating user access
 * This is a simplified implementation for demonstration purposes
 */
export class AuthMiddleware {
  /**
   * Mock authentication middleware
   * In a real application, this would validate JWT tokens or session data
   */
  static authenticate = (
    req: Request,
    _res: Response,
    next: NextFunction
  ): void => {
    try {
      // For demonstration purposes, we'll create a mock user
      // In a real application, you would:
      // 1. Extract token from Authorization header
      // 2. Validate the token
      // 3. Fetch user from database
      // 4. Attach user to request

      const authHeader = req.get('Authorization');

      if (!authHeader) {
        // For read operations, we might allow anonymous access
        // For write operations, authentication is required
        if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
          throw new UnauthorizedError('Authorization header required');
        }
        return next();
      }

      // Simple mock implementation - extract user info from header
      // Format: "Bearer userId:role" (e.g., "Bearer user123:Admin")
      const token = authHeader.replace('Bearer ', '');
      const [userId, role] = token.split(':');

      if (!userId || !role) {
        throw new UnauthorizedError('Invalid authorization format');
      }

      // Validate role
      if (!Object.values(UserRole).includes(role as UserRole)) {
        throw new UnauthorizedError('Invalid user role');
      }

      // Create mock user object
      const user = new User({
        id: userId,
        name: `User ${userId}`,
        email: `${userId}@example.com`,
        role: role as UserRole,
      });

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      next(error);
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
}
