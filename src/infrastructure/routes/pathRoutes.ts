import { Router } from 'express';
import { PathController } from '../controllers/PathController';
import { TopicPathFinder } from '../../application/services/TopicPathFinder';
import { TopicRepository } from '../repositories/TopicRepository';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { UserRole } from '../../domain/enums/UserRole';
import { FileDatabase } from '../database/FileDatabase';

/**
 * Creates and configures path-related routes
 */
export function createPathRoutes(): Router {
  const router = Router();

  // Initialize dependencies
  const database = new FileDatabase();
  const topicRepository = new TopicRepository(database);
  const pathFinder = new TopicPathFinder(topicRepository);
  const pathController = new PathController(pathFinder);

  // Validation middleware for path validation
  const validatePathRequest = ValidationMiddleware.validateRequiredFields([
    'startTopicId',
    'endTopicId',
  ]);

  // Apply authentication middleware to all routes
  router.use(AuthMiddleware.authenticate);

  // Routes

  // GET /path/stats - Get path finding statistics (admin only)
  router.get(
    '/stats',
    AuthMiddleware.requireRole(UserRole.ADMIN),
    pathController.getPathStats
  );

  // POST /path/clear-cache - Clear path finding cache (admin only)
  router.post(
    '/clear-cache',
    AuthMiddleware.requireRole(UserRole.ADMIN),
    pathController.clearPathCache
  );

  // POST /path/validate - Validate path finding parameters
  router.post(
    '/validate',
    validatePathRequest,
    pathController.validatePathRequest
  );

  return router;
}
