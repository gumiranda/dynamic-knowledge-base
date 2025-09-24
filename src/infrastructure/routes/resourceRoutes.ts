import { Router } from 'express';
import { ResourceController } from '../controllers/ResourceController';
import { ResourceService } from '../../application/services/ResourceService';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { TopicRepository } from '../repositories/TopicRepository';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { UserRole } from '../../domain/enums/UserRole';
import { FileDatabase } from '../database/FileDatabase';

/**
 * Creates and configures resource routes
 */
export function createResourceRoutes(): Router {
  const router = Router();

  // Initialize dependencies
  const database = new FileDatabase();
  const resourceRepository = new ResourceRepository(database);
  const topicRepository = new TopicRepository(database);
  const resourceService = new ResourceService(
    resourceRepository,
    topicRepository
  );
  const resourceController = new ResourceController(resourceService);

  // Validation middleware for resource creation
  const validateCreateResource = ValidationMiddleware.validateRequiredFields([
    'topicId',
    'url',
    'description',
    'type',
  ]);

  // Validation middleware for bulk operations
  const validateBulkRequest = ValidationMiddleware.validateRequiredFields([
    'topicIds',
  ]);

  // Validation middleware for resource validation
  const validateResourceAssociation =
    ValidationMiddleware.validateRequiredFields(['topicId', 'url']);

  // Apply authentication middleware to all routes
  router.use(AuthMiddleware.authenticate);

  // Routes

  // POST /resources/validate - Validate resource association
  router.post(
    '/validate',
    validateResourceAssociation,
    resourceController.validateResourceAssociation
  );

  // POST /resources/bulk - Get resources for multiple topics
  router.post(
    '/bulk',
    validateBulkRequest,
    resourceController.getBulkTopicResources
  );

  // GET /resources - Get resources with optional filtering
  router.get('/', resourceController.getResources);

  // POST /resources - Create a new resource
  router.post(
    '/',
    AuthMiddleware.requireAnyRole([UserRole.ADMIN, UserRole.EDITOR]),
    validateCreateResource,
    resourceController.createResource
  );

  // GET /resources/:id - Get a specific resource
  router.get('/:id', resourceController.getResource);

  // PUT /resources/:id - Update a resource
  router.put(
    '/:id',
    AuthMiddleware.requireAnyRole([UserRole.ADMIN, UserRole.EDITOR]),
    resourceController.updateResource
  );

  // DELETE /resources/:id - Delete a resource
  router.delete(
    '/:id',
    AuthMiddleware.requireRole(UserRole.ADMIN),
    resourceController.deleteResource
  );

  return router;
}
