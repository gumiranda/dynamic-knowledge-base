import { Request, Response, NextFunction } from 'express';
import { TopicPathFinder } from '../../application/services/TopicPathFinder';
import { User } from '../../domain/entities/User';
import {
  ValidationError,
  UnauthorizedError,
} from '../../application/errors/AppError';

/**
 * Controller for shortest path functionality between topics
 * Implements RESTful API for topic path finding and graph analysis
 */
export class PathController {
  constructor(private readonly pathFinder: TopicPathFinder) {}

  /**
   * GET /topics/:startId/path/:endId - Find shortest path between two topics
   */
  public findShortestPath = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { startId, endId } = req.params;

      // Extract user from request (optional for read operations)
      const user = req.user as User | undefined;
      if (!user) {
        throw new UnauthorizedError('Authentication required for path finding');
      }

      // Validate path parameters
      if (!startId || !endId) {
        throw new ValidationError('Both start and end topic IDs are required');
      }

      if (typeof startId !== 'string' || typeof endId !== 'string') {
        throw new ValidationError('Topic IDs must be strings');
      }

      if (startId.trim() === '' || endId.trim() === '') {
        throw new ValidationError('Topic IDs cannot be empty');
      }

      // Find shortest path through service
      const path = await this.pathFinder.findShortestPath(startId, endId);

      // Format response based on whether path was found
      if (path.length === 0) {
        res.status(200).json({
          status: 'success',
          message: 'No path found between the specified topics',
          data: {
            startTopicId: startId,
            endTopicId: endId,
            path: [],
            pathLength: 0,
            distance: -1,
            connected: false,
          },
        });
      } else {
        res.status(200).json({
          status: 'success',
          message: 'Shortest path found successfully',
          data: {
            startTopicId: startId,
            endTopicId: endId,
            path: path.map((topic) => ({
              id: topic.id,
              name: topic.name,
              content:
                topic.content.substring(0, 100) +
                (topic.content.length > 100 ? '...' : ''),
              version: topic.version,
            })),
            pathLength: path.length,
            distance: path.length - 1, // Number of hops
            connected: true,
          },
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /topics/:topicId/connections - Check if topic is connected to other topics
   */
  public checkTopicConnections = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { topicId } = req.params;
      const { targetId } = req.query;

      // Extract user from request (required for read operations)
      const user = req.user as User;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Validate topic ID
      if (!topicId || typeof topicId !== 'string' || topicId.trim() === '') {
        throw new ValidationError('Valid topic ID is required');
      }

      if (targetId) {
        // Check connection to specific topic
        if (typeof targetId !== 'string' || targetId.trim() === '') {
          throw new ValidationError('Target topic ID must be a valid string');
        }

        const connected = await this.pathFinder.areTopicsConnected(
          topicId,
          targetId as string
        );
        const distance = connected
          ? await this.pathFinder.getTopicDistance(topicId, targetId as string)
          : -1;

        res.status(200).json({
          status: 'success',
          data: {
            topicId,
            targetTopicId: targetId,
            connected,
            distance,
          },
        });
      } else {
        // Get general connectivity information
        const connectivity = await this.pathFinder.validateGraphConnectivity();

        res.status(200).json({
          status: 'success',
          data: {
            topicId,
            graphConnectivity: connectivity,
          },
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /topics/:topicId/nearby - Find topics within specified distance
   */
  public findNearbyTopics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { topicId } = req.params;
      const { distance = '2' } = req.query;

      // Extract user from request (required for read operations)
      const user = req.user as User;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Validate topic ID
      if (!topicId || typeof topicId !== 'string' || topicId.trim() === '') {
        throw new ValidationError('Valid topic ID is required');
      }

      // Validate distance parameter
      const maxDistance = parseInt(distance as string, 10);
      if (isNaN(maxDistance) || maxDistance < 0 || maxDistance > 10) {
        throw new ValidationError('Distance must be a number between 0 and 10');
      }

      // Find nearby topics through service
      const nearbyTopics = await this.pathFinder.findTopicsWithinDistance(
        topicId,
        maxDistance
      );

      // Group topics by distance
      const topicsByDistance: { [distance: number]: any[] } = {};

      // Calculate distance for each topic (except the center topic)
      for (const topic of nearbyTopics) {
        if (topic.id === topicId) {
          // Center topic is at distance 0
          if (!topicsByDistance[0]) topicsByDistance[0] = [];
          topicsByDistance[0].push({
            id: topic.id,
            name: topic.name,
            content:
              topic.content.substring(0, 100) +
              (topic.content.length > 100 ? '...' : ''),
            version: topic.version,
          });
        } else {
          // Calculate actual distance for other topics
          const actualDistance = await this.pathFinder.getTopicDistance(
            topicId,
            topic.id
          );
          if (actualDistance >= 0 && actualDistance <= maxDistance) {
            if (!topicsByDistance[actualDistance])
              topicsByDistance[actualDistance] = [];
            topicsByDistance[actualDistance].push({
              id: topic.id,
              name: topic.name,
              content:
                topic.content.substring(0, 100) +
                (topic.content.length > 100 ? '...' : ''),
              version: topic.version,
            });
          }
        }
      }

      res.status(200).json({
        status: 'success',
        data: {
          centerTopicId: topicId,
          maxDistance,
          totalTopics: nearbyTopics.length,
          topicsByDistance,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /path/stats - Get path finding statistics and cache information
   */
  public getPathStats = async (
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

      // Only admins can view path statistics
      if (!user.isAdmin()) {
        throw new UnauthorizedError(
          'Only administrators can view path statistics'
        );
      }

      // Get cache statistics
      const cacheStats = this.pathFinder.getCacheStats();

      // Get graph connectivity information
      const connectivity = await this.pathFinder.validateGraphConnectivity();

      res.status(200).json({
        status: 'success',
        data: {
          cacheStatistics: cacheStats,
          graphConnectivity: connectivity,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /path/clear-cache - Clear path finding cache
   */
  public clearPathCache = async (
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

      // Only admins can clear cache
      if (!user.isAdmin()) {
        throw new UnauthorizedError('Only administrators can clear path cache');
      }

      // Clear cache
      this.pathFinder.clearCache();

      res.status(200).json({
        status: 'success',
        message: 'Path finding cache cleared successfully',
        data: {
          clearedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /path/validate - Validate path finding parameters
   */
  public validatePathRequest = async (
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

      const { startTopicId, endTopicId } = req.body;

      // Validate request body
      if (!startTopicId || !endTopicId) {
        throw new ValidationError(
          'Both startTopicId and endTopicId are required'
        );
      }

      if (typeof startTopicId !== 'string' || typeof endTopicId !== 'string') {
        throw new ValidationError('Topic IDs must be strings');
      }

      if (startTopicId.trim() === '' || endTopicId.trim() === '') {
        throw new ValidationError('Topic IDs cannot be empty');
      }

      // Check if topics exist and are connected
      const connected = await this.pathFinder.areTopicsConnected(
        startTopicId,
        endTopicId
      );

      let distance = -1;
      let estimatedComplexity = 'unknown';

      if (connected) {
        distance = await this.pathFinder.getTopicDistance(
          startTopicId,
          endTopicId
        );

        // Estimate complexity based on distance
        if (distance <= 2) {
          estimatedComplexity = 'low';
        } else if (distance <= 5) {
          estimatedComplexity = 'medium';
        } else {
          estimatedComplexity = 'high';
        }
      }

      res.status(200).json({
        status: 'success',
        data: {
          validation: {
            startTopicId,
            endTopicId,
            topicsExist: connected || distance >= 0, // If we got a distance, topics exist
            connected,
            distance,
            estimatedComplexity,
            canProceed: true,
          },
        },
      });
    } catch (error) {
      // If validation fails due to topics not existing, return structured error
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(200).json({
          status: 'success',
          data: {
            validation: {
              startTopicId: req.body.startTopicId,
              endTopicId: req.body.endTopicId,
              topicsExist: false,
              connected: false,
              distance: -1,
              estimatedComplexity: 'unknown',
              canProceed: false,
              error: error.message,
            },
          },
        });
      } else {
        next(error);
      }
    }
  };
}
