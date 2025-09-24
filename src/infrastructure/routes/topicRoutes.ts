import { Router } from 'express';
import { TopicController } from '../controllers/TopicController';
import { ResourceController } from '../controllers/ResourceController';
import { PathController } from '../controllers/PathController';
import { TopicService } from '../../application/services/TopicService';
import { ResourceService } from '../../application/services/ResourceService';
import { TopicPathFinder } from '../../application/services/TopicPathFinder';
import { TopicRepository } from '../repositories/TopicRepository';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { TopicVersionFactory } from '../../domain/factories/TopicVersionFactory';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { UserRole } from '../../domain/enums/UserRole';
import { FileDatabase } from '../database/FileDatabase';

/**
 * Creates and configures topic routes
 */
export function createTopicRoutes(): Router {
  const router = Router();

  // Initialize dependencies
  const database = new FileDatabase();
  const topicRepository = new TopicRepository(database);
  const resourceRepository = new ResourceRepository(database);
  const versionFactory = new TopicVersionFactory();
  const topicService = new TopicService(topicRepository, versionFactory);
  const resourceService = new ResourceService(
    resourceRepository,
    topicRepository
  );
  const pathFinder = new TopicPathFinder(topicRepository);
  const topicController = new TopicController(topicService);
  const resourceController = new ResourceController(resourceService);
  const pathController = new PathController(pathFinder);

  // Validation middleware for topic creation
  const validateCreateTopic = ValidationMiddleware.validateRequiredFields([
    'name',
    'content',
  ]);

  // Apply authentication middleware to all routes
  router.use(AuthMiddleware.authenticate);

  // Routes

  // GET /topics - Get topics with optional filtering
  router.get('/', topicController.getTopics);

  // GET /topics/orphaned - Get orphaned topics (admin endpoint)
  router.get(
    '/orphaned',
    AuthMiddleware.requireRole(UserRole.ADMIN),
    topicController.getOrphanedTopics
  );

  // POST /topics - Create a new topic
  router.post(
    '/',
    AuthMiddleware.requireAnyRole([UserRole.ADMIN, UserRole.EDITOR]),
    validateCreateTopic,
    topicController.createTopic
  );

  // GET /topics/:id - Get a specific topic with optional version
  router.get('/:id', topicController.getTopic);

  // PUT /topics/:id - Update a topic
  router.put(
    '/:id',
    AuthMiddleware.requireAnyRole([UserRole.ADMIN, UserRole.EDITOR]),
    topicController.updateTopic
  );

  // DELETE /topics/:id - Soft delete a topic
  router.delete(
    '/:id',
    AuthMiddleware.requireRole(UserRole.ADMIN),
    topicController.deleteTopic
  );

  // GET /topics/:id/hierarchy - Get topic hierarchy
  router.get('/:id/hierarchy', topicController.getTopicHierarchy);

  // GET /topics/:id/versions - Get all versions of a topic
  router.get('/:id/versions', topicController.getTopicVersions);

  // GET /topics/:id/resources - Get all resources for a topic
  router.get('/:id/resources', resourceController.getTopicResources);

  // POST /topics/:id/restore - Restore a soft-deleted topic
  router.post(
    '/:id/restore',
    AuthMiddleware.requireRole(UserRole.ADMIN),
    topicController.restoreTopic
  );

  // GET /topics/:startId/path/:endId - Find shortest path between topics
  router.get('/:startId/path/:endId', pathController.findShortestPath);

  // GET /topics/:topicId/connections - Check topic connections
  router.get('/:topicId/connections', pathController.checkTopicConnections);

  // GET /topics/:topicId/nearby - Find nearby topics
  router.get('/:topicId/nearby', pathController.findNearbyTopics);

  return router;
}
