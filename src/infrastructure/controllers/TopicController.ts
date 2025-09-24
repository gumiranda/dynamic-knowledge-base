import { Request, Response, NextFunction } from 'express';
import { TopicService } from '../../application/services/TopicService';
import { User } from '../../domain/entities/User';
import {
  CreateTopicDto,
  UpdateTopicDto,
  TopicResponseDto,
} from '../../application/dtos/TopicDto';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from '../../application/errors/AppError';

/**
 * Controller for Topic-related HTTP endpoints
 * Implements RESTful API for topic management with version control
 */
export class TopicController {
  constructor(private readonly topicService: TopicService) {}

  /**
   * POST /topics - Create a new topic
   */
  public createTopic = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract user from request (will be set by auth middleware)
      const user = req.user as User;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Validate request body
      const createTopicDto: CreateTopicDto = {
        name: req.body.name,
        content: req.body.content,
        parentTopicId: req.body.parentTopicId,
      };

      // Create topic through service
      const createdTopic = await this.topicService.createTopic(
        createTopicDto,
        user
      );

      res.status(201).json({
        status: 'success',
        message: 'Topic created successfully',
        data: {
          topic: createdTopic,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /topics/:id - Retrieve a topic with optional version support
   */
  public getTopic = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const version = req.query.version
        ? parseInt(req.query.version as string, 10)
        : undefined;

      // Extract user from request (optional for read operations)
      const user = req.user as User | undefined;

      // Validate version parameter if provided
      if (version !== undefined && (isNaN(version) || version < 1)) {
        throw new ValidationError('Version must be a positive integer');
      }

      // Get topic through service
      const topic = await this.topicService.getTopic(id, version, user);

      if (!topic) {
        throw new NotFoundError(`Topic with ID ${id} not found`);
      }

      res.status(200).json({
        status: 'success',
        data: {
          topic,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /topics/:id - Update an existing topic
   */
  public updateTopic = async (
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
      const updateTopicDto: UpdateTopicDto = {
        name: req.body.name,
        content: req.body.content,
        parentTopicId: req.body.parentTopicId,
      };

      // Update topic through service
      const updatedTopic = await this.topicService.updateTopic(
        id,
        updateTopicDto,
        user
      );

      res.status(200).json({
        status: 'success',
        message: 'Topic updated successfully',
        data: {
          topic: updatedTopic,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /topics/:id - Soft delete a topic
   */
  public deleteTopic = async (
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

      // Delete topic through service
      const deleted = await this.topicService.deleteTopic(id, user);

      if (!deleted) {
        throw new NotFoundError(`Topic with ID ${id} not found`);
      }

      res.status(200).json({
        status: 'success',
        message: 'Topic deleted successfully',
        data: {
          deleted: true,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /topics/:id/hierarchy - Retrieve topic hierarchy recursively
   */
  public getTopicHierarchy = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const maxDepth = req.query.maxDepth
        ? parseInt(req.query.maxDepth as string, 10)
        : 10;

      // Extract user from request (optional for read operations)
      const user = req.user as User | undefined;
      if (!user) {
        throw new UnauthorizedError(
          'Authentication required for hierarchy access'
        );
      }

      // Validate maxDepth parameter
      if (isNaN(maxDepth) || maxDepth < 1 || maxDepth > 20) {
        throw new ValidationError('maxDepth must be between 1 and 20');
      }

      // Get hierarchy through service
      const hierarchy = await this.topicService.getTopicHierarchy(
        id,
        user,
        maxDepth
      );

      res.status(200).json({
        status: 'success',
        data: {
          hierarchy,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /topics/:id/versions - Get all versions of a topic
   */
  public getTopicVersions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      // Extract user from request (required for version access)
      const user = req.user as User;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Get versions through service
      const versions = await this.topicService.getTopicVersions(id, user);

      res.status(200).json({
        status: 'success',
        data: {
          versions,
          totalVersions: versions.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /topics - Get topics with optional filtering
   */
  public getTopics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract user from request (optional for read operations)
      const user = req.user as User | undefined;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { search, parentId, rootOnly } = req.query;

      let topics: TopicResponseDto[];

      if (search && typeof search === 'string') {
        // Search topics
        const searchResult = await this.topicService.searchTopics(search, user);
        topics = searchResult.topics;
      } else if (parentId && typeof parentId === 'string') {
        // Get child topics
        topics = await this.topicService.getChildTopics(parentId, user);
      } else if (rootOnly === 'true') {
        // Get root topics only
        topics = await this.topicService.getRootTopics(user);
      } else {
        // This would require a new method in TopicService to get all topics
        // For now, return root topics as default
        topics = await this.topicService.getRootTopics(user);
      }

      res.status(200).json({
        status: 'success',
        data: {
          topics,
          totalCount: topics.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /topics/:id/restore - Restore a soft-deleted topic
   */
  public restoreTopic = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      // Extract user from request (required for restore operations)
      const user = req.user as User;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Restore topic through service
      const restored = await this.topicService.restoreTopic(id, user);

      if (!restored) {
        throw new NotFoundError(`Topic with ID ${id} not found or not deleted`);
      }

      res.status(200).json({
        status: 'success',
        message: 'Topic restored successfully',
        data: {
          restored: true,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /topics/orphaned - Get orphaned topics
   */
  public getOrphanedTopics = async (
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

      // Get orphaned topics through service
      const orphanedTopics = await this.topicService.getOrphanedTopics(user);

      res.status(200).json({
        status: 'success',
        data: {
          topics: orphanedTopics,
          totalCount: orphanedTopics.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
