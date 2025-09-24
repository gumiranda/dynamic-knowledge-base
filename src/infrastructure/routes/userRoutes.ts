import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { UserService } from '../../application/services/UserService';
import { UserRepository } from '../repositories/UserRepository';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { UserRole } from '../../domain/enums/UserRole';
import { FileDatabase } from '../database/FileDatabase';

/**
 * Creates and configures user routes
 */
export function createUserRoutes(): Router {
  const router = Router();

  // Initialize dependencies
  const database = new FileDatabase();
  const userRepository = new UserRepository(database);
  const userService = new UserService(userRepository);
  const userController = new UserController(userService);

  // Initialize AuthMiddleware with database
  AuthMiddleware.initialize(database);

  // Validation middleware for user registration
  const validateRegisterUser = ValidationMiddleware.validateRequiredFields([
    'name',
    'email',
    'role',
  ]);

  // Validation middleware for authentication
  const validateAuthentication = ValidationMiddleware.validateRequiredFields([
    'email',
  ]);

  // Validation middleware for login
  const validateLogin = ValidationMiddleware.validateRequiredFields([
    'email',
    'password',
  ]);

  // Validation middleware for role assignment
  const validateRoleAssignment = ValidationMiddleware.validateRequiredFields([
    'newRole',
  ]);

  // Validation middleware for permission validation
  const validatePermissionCheck = ValidationMiddleware.validateRequiredFields([
    'action',
  ]);

  // Routes

  // POST /users/login - Login with email and password (no auth required)
  router.post('/login', validateLogin, userController.loginUser);

  // POST /users/authenticate - Authenticate a user (legacy endpoint, no auth required)
  router.post(
    '/authenticate',
    validateAuthentication,
    userController.authenticateUser
  );

  // POST /users/validate-permissions - Validate user permissions
  router.post(
    '/validate-permissions',
    AuthMiddleware.authenticate,
    validatePermissionCheck,
    userController.validatePermissions
  );

  // GET /users/stats - Get user statistics (admin only)
  router.get(
    '/stats',
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.ADMIN),
    userController.getUserStats
  );

  // GET /users/me - Get current user information
  router.get('/me', AuthMiddleware.authenticate, userController.getCurrentUser);

  // POST /users/register - Register a new user (no auth required)
  router.post('/register', validateRegisterUser, userController.registerUser);

  // Apply authentication middleware to remaining routes
  router.use(AuthMiddleware.authenticate);

  // GET /users - Get all users with optional filtering (admin only)
  router.get(
    '/',
    AuthMiddleware.requireRole(UserRole.ADMIN),
    userController.getUsers
  );

  // GET /users/:id - Get a specific user
  router.get('/:id', userController.getUser);

  // PUT /users/:id - Update a user
  router.put('/:id', userController.updateUser);

  // DELETE /users/:id - Delete a user (admin only)
  router.delete(
    '/:id',
    AuthMiddleware.requireRole(UserRole.ADMIN),
    userController.deleteUser
  );

  // POST /users/:id/assign-role - Assign a role to a user (admin only)
  router.post(
    '/:id/assign-role',
    AuthMiddleware.requireRole(UserRole.ADMIN),
    validateRoleAssignment,
    userController.assignRole
  );

  return router;
}
