import { Request, Response, NextFunction } from 'express';
import { ResourceController } from '../ResourceController';
import { ResourceService } from '../../../application/services/ResourceService';
import { User } from '../../../domain/entities/User';
import { UserRole } from '../../../domain/enums/UserRole';
import { ResourceType } from '../../../domain/enums/ResourceType';
import {
  CreateResourceDto,
  UpdateResourceDto,
} from '../../../application/dtos/ResourceDto';

// Mock the ResourceService
jest.mock('../../../application/services/ResourceService');

describe('ResourceController', () => {
  let resourceController: ResourceController;
  let mockResourceService: jest.Mocked<ResourceService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockResourceService = new ResourceService(
      null as any,
      null as any
    ) as jest.Mocked<ResourceService>;
    resourceController = new ResourceController(mockResourceService);

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

  describe('createResource', () => {
    it('should create a resource successfully', async () => {
      // Arrange
      const createResourceDto: CreateResourceDto = {
        topicId: 'topic1',
        url: 'https://example.com',
        description: 'Test resource',
        type: ResourceType.ARTICLE,
      };

      const mockCreatedResource = {
        id: 'resource1',
        topicId: 'topic1',
        url: 'https://example.com',
        description: 'Test resource',
        type: ResourceType.ARTICLE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.body = createResourceDto;
      mockResourceService.createResource.mockResolvedValue(
        mockCreatedResource as any
      );

      // Act
      await resourceController.createResource(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResourceService.createResource).toHaveBeenCalledWith(
        createResourceDto,
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Resource created successfully',
        data: {
          resource: mockCreatedResource,
        },
      });
    });

    it('should handle missing user', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await resourceController.createResource(
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

    it('should handle invalid resource type', async () => {
      // Arrange
      mockRequest.body = {
        topicId: 'topic1',
        url: 'https://example.com',
        description: 'Test resource',
        type: 'invalid_type',
      };

      // Act
      await resourceController.createResource(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid resource type',
        })
      );
    });
  });

  describe('getResource', () => {
    it('should retrieve a resource successfully', async () => {
      // Arrange
      const resourceId = 'resource1';
      const mockResource = {
        id: resourceId,
        topicId: 'topic1',
        url: 'https://example.com',
        description: 'Test resource',
        type: ResourceType.ARTICLE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { id: resourceId };
      mockResourceService.getResource.mockResolvedValue(mockResource as any);

      // Act
      await resourceController.getResource(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResourceService.getResource).toHaveBeenCalledWith(
        resourceId,
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          resource: mockResource,
        },
      });
    });

    it('should handle resource not found', async () => {
      // Arrange
      const resourceId = 'nonexistent';
      mockRequest.params = { id: resourceId };
      mockResourceService.getResource.mockResolvedValue(null);

      // Act
      await resourceController.getResource(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Resource with ID ${resourceId} not found`,
        })
      );
    });
  });

  describe('updateResource', () => {
    it('should update a resource successfully', async () => {
      // Arrange
      const resourceId = 'resource1';
      const updateResourceDto: UpdateResourceDto = {
        description: 'Updated description',
        type: ResourceType.VIDEO,
      };

      const mockUpdatedResource = {
        id: resourceId,
        topicId: 'topic1',
        url: 'https://example.com',
        description: 'Updated description',
        type: ResourceType.VIDEO,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { id: resourceId };
      mockRequest.body = updateResourceDto;
      mockResourceService.updateResource.mockResolvedValue(
        mockUpdatedResource as any
      );

      // Act
      await resourceController.updateResource(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResourceService.updateResource).toHaveBeenCalledWith(
        resourceId,
        updateResourceDto,
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Resource updated successfully',
        data: {
          resource: mockUpdatedResource,
        },
      });
    });
  });

  describe('deleteResource', () => {
    it('should delete a resource successfully', async () => {
      // Arrange
      const resourceId = 'resource1';
      mockRequest.params = { id: resourceId };
      mockResourceService.deleteResource.mockResolvedValue(true);

      // Act
      await resourceController.deleteResource(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResourceService.deleteResource).toHaveBeenCalledWith(
        resourceId,
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Resource deleted successfully',
        data: {
          deleted: true,
        },
      });
    });
  });

  describe('getTopicResources', () => {
    it('should retrieve topic resources successfully', async () => {
      // Arrange
      const topicId = 'topic1';
      const mockResources = [
        {
          id: 'resource1',
          topicId: topicId,
          url: 'https://example.com',
          description: 'Test resource',
          type: ResourceType.ARTICLE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRequest.params = { id: topicId };
      mockResourceService.getResourcesByTopic.mockResolvedValue(
        mockResources as any
      );

      // Act
      await resourceController.getTopicResources(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResourceService.getResourcesByTopic).toHaveBeenCalledWith(
        topicId,
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          topicId,
          resources: mockResources,
          totalCount: mockResources.length,
        },
      });
    });
  });

  describe('getResources', () => {
    it('should get resources with search filter', async () => {
      // Arrange
      const searchTerm = 'test';
      const mockSearchResult = {
        resources: [
          {
            id: 'resource1',
            topicId: 'topic1',
            url: 'https://example.com',
            description: 'Test resource',
            type: ResourceType.ARTICLE,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        totalCount: 1,
        searchTerm,
      };

      mockRequest.query = { search: searchTerm };
      mockResourceService.searchResources.mockResolvedValue(
        mockSearchResult as any
      );

      // Act
      await resourceController.getResources(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResourceService.searchResources).toHaveBeenCalledWith(
        searchTerm,
        mockRequest.user,
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should get resources by type', async () => {
      // Arrange
      const resourceType = ResourceType.VIDEO;
      const mockResources = [
        {
          id: 'resource1',
          topicId: 'topic1',
          url: 'https://example.com',
          description: 'Test video',
          type: ResourceType.VIDEO,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRequest.query = { type: resourceType };
      mockResourceService.getResourcesByType.mockResolvedValue(
        mockResources as any
      );

      // Act
      await resourceController.getResources(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResourceService.getResourcesByType).toHaveBeenCalledWith(
        resourceType,
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});
