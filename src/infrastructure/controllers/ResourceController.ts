import { Request, Response, NextFunction } from 'express';
import { ResourceService } from '../../application/services/ResourceService';
import { User } from '../../domain/entities/User';
import { ResourceType } from '../../domain/enums/ResourceType';
import {
  CreateResourceDto,
  UpdateResourceDto,
  ResourceResponseDto,
} from '../../application/dtos/ResourceDto';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from '../../application/errors/AppError';

/**
 * Controller for Resource-related HTTP endpoints
 * Implements RESTful API for resource management
 */
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  /**
   * POST /resources - Create a new resource
   */
  public createResource = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract user from request (required for write operations)
      const user = req.user as User;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Validate request body
      const createResourceDto: CreateResourceDto = {
        topicId: req.body.topicId,
        url: req.body.url,
        description: req.body.description,
        type: req.body.type,
      };

      // Validate resource type
      if (!Object.values(ResourceType).includes(createResourceDto.type)) {
        throw new ValidationError('Invalid resource type');
      }

      // Create resource through service
      const createdResource = await this.resourceService.createResource(
        createResourceDto,
        user
      );

      res.status(201).json({
        status: 'success',
        message: 'Resource created successfully',
        data: {
          resource: createdResource,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /resources - Get all resources with optional filtering
   */
  public getResources = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract user from request (required for read operations)
      const user = req.user as User;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { search, type, limit } = req.query;

      let resources: ResourceResponseDto[];

      if (search && typeof search === 'string') {
        // Search resources by description
        const filterType =
          type && typeof type === 'string' ? (type as ResourceType) : undefined;

        if (filterType && !Object.values(ResourceType).includes(filterType)) {
          throw new ValidationError('Invalid resource type filter');
        }

        const searchResult = await this.resourceService.searchResources(
          search,
          user,
          filterType
        );
        resources = searchResult.resources;
      } else if (type && typeof type === 'string') {
        // Filter by resource type
        if (!Object.values(ResourceType).includes(type as ResourceType)) {
          throw new ValidationError('Invalid resource type');
        }
        resources = await this.resourceService.getResourcesByType(
          type as ResourceType,
          user
        );
      } else if (limit && typeof limit === 'string') {
        // Get recent resources
        const limitNum = parseInt(limit, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
          throw new ValidationError('Limit must be between 1 and 100');
        }
        resources = await this.resourceService.getRecentResources(
          limitNum,
          user
        );
      } else {
        // Get recent resources with default limit
        resources = await this.resourceService.getRecentResources(20, user);
      }

      res.status(200).json({
        status: 'success',
        data: {
          resources,
          totalCount: resources.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /resources/:id - Get a specific resource
   */
  public getResource = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      // Extract user from request (required for read operations)
      const user = req.user as User;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Get resource through service
      const resource = await this.resourceService.getResource(id, user);

      if (!resource) {
        throw new NotFoundError(`Resource with ID ${id} not found`);
      }

      res.status(200).json({
        status: 'success',
        data: {
          resource,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /resources/:id - Update an existing resource
   */
  public updateResource = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      // Extract user from request (required for write operations)
      const user = req.user as User;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Validate request body
      const updateResourceDto: UpdateResourceDto = {
        url: req.body.url,
        description: req.body.description,
        type: req.body.type,
        topicId: req.body.topicId,
      };

      // Validate resource type if provided
      if (
        updateResourceDto.type &&
        !Object.values(ResourceType).includes(updateResourceDto.type)
      ) {
        throw new ValidationError('Invalid resource type');
      }

      // Update resource through service
      const updatedResource = await this.resourceService.updateResource(
        id,
        updateResourceDto,
        user
      );

      res.status(200).json({
        status: 'success',
        message: 'Resource updated successfully',
        data: {
          resource: updatedResource,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /resources/:id - Delete a resource
   */
  public deleteResource = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      // Extract user from request (required for delete operations)
      const user = req.user as User;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Delete resource through service
      const deleted = await this.resourceService.deleteResource(id, user);

      if (!deleted) {
        throw new NotFoundError(`Resource with ID ${id} not found`);
      }

      res.status(200).json({
        status: 'success',
        message: 'Resource deleted successfully',
        data: {
          deleted: true,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /topics/:id/resources - Get all resources for a specific topic
   */
  public getTopicResources = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: topicId } = req.params;

      // Extract user from request (required for read operations)
      const user = req.user as User;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Get resources for topic through service
      const resources = await this.resourceService.getResourcesByTopic(
        topicId,
        user
      );

      res.status(200).json({
        status: 'success',
        data: {
          topicId,
          resources,
          totalCount: resources.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /resources/validate - Validate resource association
   */
  public validateResourceAssociation = async (
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

      const { topicId, url } = req.body;

      if (!topicId || typeof topicId !== 'string') {
        throw new ValidationError('Topic ID is required');
      }

      if (!url || typeof url !== 'string') {
        throw new ValidationError('URL is required');
      }

      // Validate resource association through service
      const validation = await this.resourceService.validateResourceAssociation(
        topicId,
        url,
        user
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
   * POST /resources/bulk - Get resources for multiple topics
   */
  public getBulkTopicResources = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract user from request (required for read operations)
      const user = req.user as User;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { topicIds } = req.body;

      if (!Array.isArray(topicIds)) {
        throw new ValidationError('topicIds must be an array');
      }

      if (topicIds.length === 0) {
        throw new ValidationError('topicIds array cannot be empty');
      }

      if (topicIds.length > 50) {
        throw new ValidationError(
          'Cannot request resources for more than 50 topics at once'
        );
      }

      // Validate all topic IDs are strings
      for (const topicId of topicIds) {
        if (typeof topicId !== 'string') {
          throw new ValidationError('All topic IDs must be strings');
        }
      }

      // Get resources grouped by topic through service
      const topicResources =
        await this.resourceService.getResourcesGroupedByTopic(topicIds, user);

      res.status(200).json({
        status: 'success',
        data: {
          topicResources,
          totalTopics: topicResources.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
