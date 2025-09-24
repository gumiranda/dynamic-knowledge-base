import { Request, Response, NextFunction } from 'express';
import { PathController } from '../PathController';
import { TopicPathFinder } from '../../../application/services/TopicPathFinder';
import { User } from '../../../domain/entities/User';
import { Topic } from '../../../domain/entities/Topic';
import { UserRole } from '../../../domain/enums/UserRole';

// Mock the TopicPathFinder
jest.mock('../../../application/services/TopicPathFinder');

describe('PathController', () => {
  let pathController: PathController;
  let mockPathFinder: jest.Mocked<TopicPathFinder>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockPathFinder = new TopicPathFinder(
      null as any
    ) as jest.Mocked<TopicPathFinder>;
    pathController = new PathController(mockPathFinder);

    mockRequest = {
      params: {},
      body: {},
      query: {},
      user: new User({
        id: 'user1',
        name: 'Test User',
        email: 'test@example.com',
        role: UserRole.VIEWER,
      }),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('findShortestPath', () => {
    it('should find shortest path successfully', async () => {
      // Arrange
      const startId = 'topic1';
      const endId = 'topic2';
      const mockPath = [
        new Topic({
          id: 'topic1',
          name: 'Topic 1',
          content: 'Content 1',
        }),
        new Topic({
          id: 'topic2',
          name: 'Topic 2',
          content: 'Content 2',
        }),
      ];

      mockRequest.params = { startId, endId };
      mockPathFinder.findShortestPath.mockResolvedValue(mockPath);

      // Act
      await pathController.findShortestPath(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockPathFinder.findShortestPath).toHaveBeenCalledWith(
        startId,
        endId
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Shortest path found successfully',
        data: {
          startTopicId: startId,
          endTopicId: endId,
          path: expect.arrayContaining([
            expect.objectContaining({
              id: 'topic1',
              name: 'Topic 1',
            }),
            expect.objectContaining({
              id: 'topic2',
              name: 'Topic 2',
            }),
          ]),
          pathLength: 2,
          distance: 1,
          connected: true,
        },
      });
    });

    it('should handle no path found', async () => {
      // Arrange
      const startId = 'topic1';
      const endId = 'topic2';

      mockRequest.params = { startId, endId };
      mockPathFinder.findShortestPath.mockResolvedValue([]);

      // Act
      await pathController.findShortestPath(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
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
    });

    it('should handle missing user', async () => {
      // Arrange
      mockRequest.user = undefined;
      mockRequest.params = { startId: 'topic1', endId: 'topic2' };

      // Act
      await pathController.findShortestPath(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required for path finding',
        })
      );
    });

    it('should handle missing parameters', async () => {
      // Arrange
      mockRequest.params = { startId: 'topic1' }; // Missing endId

      // Act
      await pathController.findShortestPath(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Both start and end topic IDs are required',
        })
      );
    });

    it('should handle empty topic IDs', async () => {
      // Arrange
      mockRequest.params = { startId: ' ', endId: 'topic2' }; // Space instead of empty

      // Act
      await pathController.findShortestPath(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Topic IDs cannot be empty',
        })
      );
    });
  });

  describe('checkTopicConnections', () => {
    it('should check connection to specific topic', async () => {
      // Arrange
      const topicId = 'topic1';
      const targetId = 'topic2';

      mockRequest.params = { topicId };
      mockRequest.query = { targetId };
      mockPathFinder.areTopicsConnected.mockResolvedValue(true);
      mockPathFinder.getTopicDistance.mockResolvedValue(2);

      // Act
      await pathController.checkTopicConnections(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockPathFinder.areTopicsConnected).toHaveBeenCalledWith(
        topicId,
        targetId
      );
      expect(mockPathFinder.getTopicDistance).toHaveBeenCalledWith(
        topicId,
        targetId
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          topicId,
          targetTopicId: targetId,
          connected: true,
          distance: 2,
        },
      });
    });

    it('should get general connectivity information', async () => {
      // Arrange
      const topicId = 'topic1';
      const mockConnectivity = {
        isFullyConnected: true,
        componentCount: 1,
        isolatedTopics: [],
      };

      mockRequest.params = { topicId };
      mockRequest.query = {}; // No targetId
      mockPathFinder.validateGraphConnectivity.mockResolvedValue(
        mockConnectivity
      );

      // Act
      await pathController.checkTopicConnections(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockPathFinder.validateGraphConnectivity).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          topicId,
          graphConnectivity: mockConnectivity,
        },
      });
    });
  });

  describe('findNearbyTopics', () => {
    it('should find nearby topics successfully', async () => {
      // Arrange
      const topicId = 'topic1';
      const distance = '2';
      const mockNearbyTopics = [
        new Topic({
          id: 'topic1',
          name: 'Center Topic',
          content: 'Center content',
        }),
        new Topic({
          id: 'topic2',
          name: 'Nearby Topic',
          content: 'Nearby content',
        }),
      ];

      mockRequest.params = { topicId };
      mockRequest.query = { distance };
      mockPathFinder.findTopicsWithinDistance.mockResolvedValue(
        mockNearbyTopics
      );
      mockPathFinder.getTopicDistance.mockResolvedValue(1);

      // Act
      await pathController.findNearbyTopics(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockPathFinder.findTopicsWithinDistance).toHaveBeenCalledWith(
        topicId,
        2
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          centerTopicId: topicId,
          maxDistance: 2,
          totalTopics: 2,
          topicsByDistance: expect.any(Object),
        },
      });
    });

    it('should handle invalid distance parameter', async () => {
      // Arrange
      const topicId = 'topic1';
      mockRequest.params = { topicId };
      mockRequest.query = { distance: 'invalid' };

      // Act
      await pathController.findNearbyTopics(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Distance must be a number between 0 and 10',
        })
      );
    });
  });

  describe('getPathStats', () => {
    it('should get path statistics for admin user', async () => {
      // Arrange
      mockRequest.user = new User({
        id: 'admin1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });

      const mockCacheStats = {
        pathCacheSize: 10,
        pathCacheMaxSize: 1000,
        graphCacheValid: true,
      };

      const mockConnectivity = {
        isFullyConnected: true,
        componentCount: 1,
        isolatedTopics: [],
      };

      mockPathFinder.getCacheStats.mockReturnValue(mockCacheStats);
      mockPathFinder.validateGraphConnectivity.mockResolvedValue(
        mockConnectivity
      );

      // Act
      await pathController.getPathStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockPathFinder.getCacheStats).toHaveBeenCalled();
      expect(mockPathFinder.validateGraphConnectivity).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          cacheStatistics: mockCacheStats,
          graphConnectivity: mockConnectivity,
          timestamp: expect.any(String),
        },
      });
    });

    it('should reject non-admin user', async () => {
      // Arrange
      mockRequest.user = new User({
        id: 'user1',
        name: 'Regular User',
        email: 'user@example.com',
        role: UserRole.VIEWER,
      });

      // Act
      await pathController.getPathStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Only administrators can view path statistics',
        })
      );
    });
  });

  describe('clearPathCache', () => {
    it('should clear cache for admin user', async () => {
      // Arrange
      mockRequest.user = new User({
        id: 'admin1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });

      // Act
      await pathController.clearPathCache(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockPathFinder.clearCache).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Path finding cache cleared successfully',
        data: {
          clearedAt: expect.any(String),
        },
      });
    });
  });

  describe('validatePathRequest', () => {
    it('should validate path request successfully', async () => {
      // Arrange
      const startTopicId = 'topic1';
      const endTopicId = 'topic2';

      mockRequest.body = { startTopicId, endTopicId };
      mockPathFinder.areTopicsConnected.mockResolvedValue(true);
      mockPathFinder.getTopicDistance.mockResolvedValue(2);

      // Act
      await pathController.validatePathRequest(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockPathFinder.areTopicsConnected).toHaveBeenCalledWith(
        startTopicId,
        endTopicId
      );
      expect(mockPathFinder.getTopicDistance).toHaveBeenCalledWith(
        startTopicId,
        endTopicId
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          validation: {
            startTopicId,
            endTopicId,
            topicsExist: true,
            connected: true,
            distance: 2,
            estimatedComplexity: 'low',
            canProceed: true,
          },
        },
      });
    });

    it('should handle missing parameters', async () => {
      // Arrange
      mockRequest.body = { startTopicId: 'topic1' }; // Missing endTopicId

      // Act
      await pathController.validatePathRequest(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Both startTopicId and endTopicId are required',
        })
      );
    });
  });
});
