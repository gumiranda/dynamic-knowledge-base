import { Request, Response, NextFunction } from 'express';
import { UserService } from '../../application/services/UserService';
import { User } from '../../domain/entities/User';
import { UserRole } from '../../domain/enums/UserRole';
import {
  RegisterUserDto,
  UpdateUserDto,
  LoginUserDto,
  AssignRoleDto,
} from '../../application/dtos/UserDto';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from '../../application/errors/AppError';

/**
 * Controller for User-related HTTP endpoints
 * Implements RESTful API for user management with authentication and authorization
 */
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * POST /users - Register a new user
   */
  public registerUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract user from request (optional for self-registration)
      const registeredBy = req.user as User | undefined;

      // Validate request body
      const registerUserDto: RegisterUserDto = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
        password: req.body.password, // Optional password field
      };

      // Validate role
      if (!Object.values(UserRole).includes(registerUserDto.role)) {
        throw new ValidationError('Invalid user role');
      }

      // Handle role assignment based on registration context
      if (!registeredBy) {
        // Public registration - force VIEWER role
        registerUserDto.role = UserRole.VIEWER;
      } else if (
        !registeredBy.isAdmin() &&
        registerUserDto.role !== UserRole.VIEWER
      ) {
        // Non-admin authenticated users can only create VIEWER accounts
        throw new UnauthorizedError(
          'Only administrators can register users with elevated roles'
        );
      }
      // Admin users can create accounts with any role (no additional validation needed)

      // Register user through service
      const createdUser = await this.userService.registerUser(
        registerUserDto,
        registeredBy
      );

      res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: {
          user: createdUser,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /users/login - Login with email and password
   */
  public loginUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request body
      const loginUserDto: LoginUserDto = {
        email: req.body.email,
        password: req.body.password,
      };

      // Validate required fields
      if (!loginUserDto.email) {
        throw new ValidationError('Email is required');
      }

      if (!loginUserDto.password) {
        throw new ValidationError('Password is required');
      }

      // Authenticate user and get JWT tokens
      const loginResponse = await this.userService.loginUser(loginUserDto);

      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: loginResponse,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /users - Get all users (admin only)
   */
  public getUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract user from request (required for admin operations)
      const user = req.user as User;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { search, role } = req.query;

      let users;

      if (search && typeof search === 'string') {
        // Search users by name or email
        const roleFilter =
          role && typeof role === 'string' ? (role as UserRole) : undefined;

        if (roleFilter && !Object.values(UserRole).includes(roleFilter)) {
          throw new ValidationError('Invalid role filter');
        }

        const searchResult = await this.userService.searchUsers(
          search,
          user,
          roleFilter
        );
        users = searchResult.users;
      } else {
        // Get all users
        users = await this.userService.getAllUsers(user);

        // Apply role filter if specified
        if (role && typeof role === 'string') {
          if (!Object.values(UserRole).includes(role as UserRole)) {
            throw new ValidationError('Invalid role filter');
          }
          users = users.filter((u) => u.role === role);
        }
      }

      res.status(200).json({
        status: 'success',
        data: {
          users,
          totalCount: users.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /users/:id - Get a specific user
   */
  public getUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      // Extract user from request (required for read operations)
      const requestedBy = req.user as User;
      if (!requestedBy) {
        throw new UnauthorizedError('Authentication required');
      }

      // Get user through service
      const user = await this.userService.getUser(id, requestedBy);

      if (!user) {
        throw new NotFoundError(`User with ID ${id} not found`);
      }

      res.status(200).json({
        status: 'success',
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /users/:id - Update a user
   */
  public updateUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      // Extract user from request (required for write operations)
      const updatedBy = req.user as User;
      if (!updatedBy) {
        throw new UnauthorizedError('Authentication required');
      }

      // Validate request body
      const updateUserDto: UpdateUserDto = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
      };

      // Validate role if provided
      if (
        updateUserDto.role &&
        !Object.values(UserRole).includes(updateUserDto.role)
      ) {
        throw new ValidationError('Invalid user role');
      }

      // Update user through service
      const updatedUser = await this.userService.updateUser(
        id,
        updateUserDto,
        updatedBy
      );

      res.status(200).json({
        status: 'success',
        message: 'User updated successfully',
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /users/:id - Delete a user (admin only)
   */
  public deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      // Extract user from request (required for delete operations)
      const deletedBy = req.user as User;
      if (!deletedBy) {
        throw new UnauthorizedError('Authentication required');
      }

      // Delete user through service
      const deleted = await this.userService.deleteUser(id, deletedBy);

      if (!deleted) {
        throw new NotFoundError(`User with ID ${id} not found`);
      }

      res.status(200).json({
        status: 'success',
        message: 'User deleted successfully',
        data: {
          deleted: true,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /users/:id/assign-role - Assign a role to a user (admin only)
   */
  public assignRole = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: userId } = req.params;

      // Extract user from request (required for admin operations)
      const assignedBy = req.user as User;
      if (!assignedBy) {
        throw new UnauthorizedError('Authentication required');
      }

      const { newRole } = req.body;

      if (!newRole) {
        throw new ValidationError('New role is required');
      }

      if (!Object.values(UserRole).includes(newRole)) {
        throw new ValidationError('Invalid role specified');
      }

      // Create assignment DTO
      const assignRoleDto: AssignRoleDto = {
        userId,
        newRole,
        assignedBy: assignedBy.id,
      };

      // Assign role through service
      const updatedUser = await this.userService.assignRole(
        assignRoleDto,
        assignedBy
      );

      res.status(200).json({
        status: 'success',
        message: 'Role assigned successfully',
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /users/stats - Get user statistics (admin only)
   */
  public getUserStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract user from request (required for admin operations)
      const requestedBy = req.user as User;
      if (!requestedBy) {
        throw new UnauthorizedError('Authentication required');
      }

      // Get user statistics through service
      const stats = await this.userService.getUserStats(requestedBy);

      res.status(200).json({
        status: 'success',
        data: {
          stats,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /users/validate-permissions - Validate user permissions
   */
  public validatePermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract user from request (required for validation)
      const user = req.user as User;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { action, resource } = req.body;

      if (!action || !['read', 'write', 'delete'].includes(action)) {
        throw new ValidationError(
          'Valid action is required (read, write, delete)'
        );
      }

      // Validate permissions through service
      const validation = await this.userService.validateUserPermissions(
        user,
        action,
        resource
      );

      res.status(200).json({
        status: 'success',
        data: {
          validation,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /users/me - Get current user information
   */
  public getCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract user from request (required)
      const user = req.user as User;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Get current user information through service
      const currentUser = await this.userService.getUser(user.id, user);

      if (!currentUser) {
        throw new NotFoundError('Current user not found');
      }

      res.status(200).json({
        status: 'success',
        data: {
          user: currentUser,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
