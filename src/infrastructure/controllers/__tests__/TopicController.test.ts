import { Request, Response, NextFunction } from 'express';
import { TopicController } from '../TopicController';
import { TopicService } from '../../../application/services/TopicService';
import { User } from '../../../domain/entities/User';
import { UserRole } from '../../../domain/enums/UserRole';
import {
  CreateTopicDto,
  UpdateTopicDto,
} from '../../../application/dtos/TopicDto';

// Mock the TopicService
jest.mock('../../../application/services/TopicService');

describe('TopicController', () => {
  let topicController: TopicController;
  let mockTopicService: jest.Mocked<TopicService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockTopicService = new TopicService(
      null as any,
      null as any
    ) as jest.Mocked<TopicService>;
    topicController = new TopicController(mockTopicService);

    mockRequest = {
      params: {},
      body: {},
      query: {},
      user: new User({
        id: 'user1',
        name: 'Test User',
        email: 'test@example.com',
        role: UserRole.EDITOR,
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

  describe('createTopic', () => {
    it('should create a topic successfully', async () => {
      // Arrange
      const createTopicDto: CreateTopicDto = {
        name: 'Test Topic',
        content: 'Test content',
        parentTopicId: undefined,
      };

      const mockCreatedTopic = {
        id: 'topic1',
        name: 'Test Topic',
        content: 'Test content',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.body = createTopicDto;
      mockTopicService.createTopic.mockResolvedValue(mockCreatedTopic as any);

      // Act
      await topicController.createTopic(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockTopicService.createTopic).toHaveBeenCalledWith(
        createTopicDto,
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Topic created successfully',
        data: {
          topic: mockCreatedTopic,
        },
      });
    });

    it('should handle missing user', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await topicController.createTopic(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
        })
      );
    });
  });

  describe('getTopic', () => {
    it('should retrieve a topic successfully', async () => {
      // Arrange
      const topicId = 'topic1';
      const mockTopic = {
        id: topicId,
        name: 'Test Topic',
        content: 'Test content',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { id: topicId };
      mockTopicService.getTopic.mockResolvedValue(mockTopic as any);

      // Act
      await topicController.getTopic(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockTopicService.getTopic).toHaveBeenCalledWith(
        topicId,
        undefined,
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          topic: mockTopic,
        },
      });
    });

    it('should handle topic not found', async () => {
      // Arrange
      const topicId = 'nonexistent';
      mockRequest.params = { id: topicId };
      mockTopicService.getTopic.mockResolvedValue(null);

      // Act
      await topicController.getTopic(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Topic with ID ${topicId} not found`,
        })
      );
    });

    it('should handle version parameter', async () => {
      // Arrange
      const topicId = 'topic1';
      const version = 2;
      const mockTopic = {
        id: topicId,
        name: 'Test Topic',
        content: 'Test content',
        version: version,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { id: topicId };
      mockRequest.query = { version: version.toString() };
      mockTopicService.getTopic.mockResolvedValue(mockTopic as any);

      // Act
      await topicController.getTopic(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockTopicService.getTopic).toHaveBeenCalledWith(
        topicId,
        version,
        mockRequest.user
      );
    });
  });

  describe('updateTopic', () => {
    it('should update a topic successfully', async () => {
      // Arrange
      const topicId = 'topic1';
      const updateTopicDto: UpdateTopicDto = {
        name: 'Updated Topic',
        content: 'Updated content',
      };

      const mockUpdatedTopic = {
        id: topicId,
        name: 'Updated Topic',
        content: 'Updated content',
        version: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { id: topicId };
      mockRequest.body = updateTopicDto;
      mockTopicService.updateTopic.mockResolvedValue(mockUpdatedTopic as any);

      // Act
      await topicController.updateTopic(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockTopicService.updateTopic).toHaveBeenCalledWith(
        topicId,
        updateTopicDto,
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Topic updated successfully',
        data: {
          topic: mockUpdatedTopic,
        },
      });
    });
  });

  describe('deleteTopic', () => {
    it('should delete a topic successfully', async () => {
      // Arrange
      const topicId = 'topic1';
      mockRequest.params = { id: topicId };
      mockTopicService.deleteTopic.mockResolvedValue(true);

      // Act
      await topicController.deleteTopic(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockTopicService.deleteTopic).toHaveBeenCalledWith(
        topicId,
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Topic deleted successfully',
        data: {
          deleted: true,
        },
      });
    });
  });

  describe('getTopicHierarchy', () => {
    it('should retrieve topic hierarchy successfully', async () => {
      // Arrange
      const topicId = 'topic1';
      const mockHierarchy = {
        topic: {
          id: topicId,
          name: 'Root Topic',
          content: 'Root content',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        children: [],
        depth: 0,
      };

      mockRequest.params = { id: topicId };
      mockTopicService.getTopicHierarchy.mockResolvedValue(
        mockHierarchy as any
      );

      // Act
      await topicController.getTopicHierarchy(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockTopicService.getTopicHierarchy).toHaveBeenCalledWith(
        topicId,
        mockRequest.user,
        10
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          hierarchy: mockHierarchy,
        },
      });
    });

    it('should handle maxDepth parameter', async () => {
      // Arrange
      const topicId = 'topic1';
      const maxDepth = 5;
      mockRequest.params = { id: topicId };
      mockRequest.query = { maxDepth: maxDepth.toString() };
      mockTopicService.getTopicHierarchy.mockResolvedValue({} as any);

      // Act
      await topicController.getTopicHierarchy(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockTopicService.getTopicHierarchy).toHaveBeenCalledWith(
        topicId,
        mockRequest.user,
        maxDepth
      );
    });
  });
});
