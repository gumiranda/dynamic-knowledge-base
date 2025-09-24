import { ResourceService } from '../ResourceService';
import { Resource } from '../../../domain/entities/Resource';
import { User } from '../../../domain/entities/User';
import { Topic } from '../../../domain/entities/Topic';
import { UserRole } from '../../../domain/enums/UserRole';
import { ResourceType } from '../../../domain/enums/ResourceType';
import { IResourceRepository } from '../../../domain/repositories/IResourceRepository';
import { ITopicRepository } from '../../../domain/repositories/ITopicRepository';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '../../errors/AppError';
import { CreateResourceDto, UpdateResourceDto } from '../../dtos/ResourceDto';

// Mock implementations
const mockResourceRepository: jest.Mocked<IResourceRepository> = {
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByTopicId: jest.fn(),
  findByType: jest.fn(),
  findByUrl: jest.fn(),
  findByDescription: jest.fn(),
  findByTopicIds: jest.fn(),
  countByTopicId: jest.fn(),
  countByType: jest.fn(),
  existsByTopicAndUrl: jest.fn(),
  findByDateRange: jest.fn(),
  findMostRecent: jest.fn(),
  deleteByTopicId: jest.fn(),
  updateTopicId: jest.fn(),
};

const mockTopicRepository: jest.Mocked<ITopicRepository> = {
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByVersion: jest.fn(),
  findAllVersions: jest.fn(),
  findByParentId: jest.fn(),
  findRootTopics: jest.fn(),
  findLatestVersion: jest.fn(),
  getCurrentVersion: jest.fn(),
  exists: jest.fn(),
  findByName: jest.fn(),
  findByContent: jest.fn(),
  softDelete: jest.fn(),
  restore: jest.fn(),
  isDeleted: jest.fn(),
};

describe('ResourceService', () => {
  let resourceService: ResourceService;
  let adminUser: User;
  let editorUser: User;
  let viewerUser: User;
  let sampleTopic: Topic;
  let sampleResource: Resource;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize service
    resourceService = new ResourceService(
      mockResourceRepository,
      mockTopicRepository
    );

    // Create test users
    adminUser = new User({
      name: 'Admin User',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
    });

    editorUser = new User({
      name: 'Editor User',
      email: 'editor@test.com',
      role: UserRole.EDITOR,
    });

    viewerUser = new User({
      name: 'Viewer User',
      email: 'viewer@test.com',
      role: UserRole.VIEWER,
    });

    // Create test topic
    sampleTopic = new Topic({
      name: 'Sample Topic',
      content: 'Sample content',
    });

    // Create test resource
    sampleResource = new Resource({
      topicId: sampleTopic.id,
      url: 'https://example.com/resource',
      description: 'Sample resource',
      type: ResourceType.ARTICLE,
    });
  });

  describe('createResource', () => {
    const validCreateDto: CreateResourceDto = {
      topicId: 'topic-id',
      url: 'https://example.com/new-resource',
      description: 'New resource description',
      type: ResourceType.ARTICLE,
    };

    it('should create resource successfully with admin user', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockResourceRepository.existsByTopicAndUrl.mockResolvedValue(false);
      mockResourceRepository.create.mockResolvedValue(sampleResource);

      // Act
      const result = await resourceService.createResource(
        validCreateDto,
        adminUser
      );

      // Assert
      expect(mockTopicRepository.findLatestVersion).toHaveBeenCalledWith(
        validCreateDto.topicId
      );
      expect(mockResourceRepository.existsByTopicAndUrl).toHaveBeenCalledWith(
        validCreateDto.topicId,
        validCreateDto.url
      );
      expect(mockResourceRepository.create).toHaveBeenCalledWith(
        expect.any(Resource)
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: sampleResource.id,
          url: sampleResource.url,
          description: sampleResource.description,
          type: sampleResource.type,
        })
      );
    });

    it('should create resource successfully with editor user', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockResourceRepository.existsByTopicAndUrl.mockResolvedValue(false);
      mockResourceRepository.create.mockResolvedValue(sampleResource);

      // Act
      const result = await resourceService.createResource(
        validCreateDto,
        editorUser
      );

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw UnauthorizedError for viewer user', async () => {
      // Act & Assert
      await expect(
        resourceService.createResource(validCreateDto, viewerUser)
      ).rejects.toThrow(UnauthorizedError);
      expect(mockResourceRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when topic not found', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      // Act & Assert
      await expect(
        resourceService.createResource(validCreateDto, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when topic is deleted', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(true);

      // Act & Assert
      await expect(
        resourceService.createResource(validCreateDto, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError when resource URL already exists for topic', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockResourceRepository.existsByTopicAndUrl.mockResolvedValue(true);

      // Act & Assert
      await expect(
        resourceService.createResource(validCreateDto, adminUser)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError for empty URL', async () => {
      // Arrange
      const invalidDto: CreateResourceDto = {
        ...validCreateDto,
        url: '',
      };

      // Act & Assert
      await expect(
        resourceService.createResource(invalidDto, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for URL exceeding 2048 characters', async () => {
      // Arrange
      const invalidDto: CreateResourceDto = {
        ...validCreateDto,
        url: 'https://example.com/' + 'a'.repeat(2048),
      };

      // Act & Assert
      await expect(
        resourceService.createResource(invalidDto, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for description exceeding 1000 characters', async () => {
      // Arrange
      const invalidDto: CreateResourceDto = {
        ...validCreateDto,
        description: 'a'.repeat(1001),
      };

      // Act & Assert
      await expect(
        resourceService.createResource(invalidDto, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid resource type', async () => {
      // Arrange
      const invalidDto: CreateResourceDto = {
        ...validCreateDto,
        type: 'invalid-type' as ResourceType,
      };

      // Act & Assert
      await expect(
        resourceService.createResource(invalidDto, adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateResource', () => {
    const validUpdateDto: UpdateResourceDto = {
      url: 'https://example.com/updated-resource',
      description: 'Updated description',
      type: ResourceType.VIDEO,
    };

    it('should update resource successfully', async () => {
      // Arrange
      mockResourceRepository.findById.mockResolvedValue(sampleResource);
      mockResourceRepository.existsByTopicAndUrl.mockResolvedValue(false);
      const updatedResource = new Resource({
        ...sampleResource,
        ...validUpdateDto,
      });
      mockResourceRepository.update.mockResolvedValue(updatedResource);

      // Act
      const result = await resourceService.updateResource(
        sampleResource.id,
        validUpdateDto,
        adminUser
      );

      // Assert
      expect(mockResourceRepository.update).toHaveBeenCalledWith(
        sampleResource.id,
        expect.any(Resource)
      );
      expect(result.url).toBe(validUpdateDto.url);
      expect(result.description).toBe(validUpdateDto.description);
      expect(result.type).toBe(validUpdateDto.type);
    });

    it('should throw UnauthorizedError for viewer user', async () => {
      // Act & Assert
      await expect(
        resourceService.updateResource(
          sampleResource.id,
          validUpdateDto,
          viewerUser
        )
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError when resource not found', async () => {
      // Arrange
      mockResourceRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        resourceService.updateResource(
          'non-existent-id',
          validUpdateDto,
          adminUser
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should validate new topic when topicId is updated', async () => {
      // Arrange
      const updateWithNewTopic: UpdateResourceDto = {
        topicId: 'new-topic-id',
      };

      mockResourceRepository.findById.mockResolvedValue(sampleResource);
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockResourceRepository.existsByTopicAndUrl.mockResolvedValue(false);
      mockResourceRepository.update.mockResolvedValue(sampleResource);

      // Act
      await resourceService.updateResource(
        sampleResource.id,
        updateWithNewTopic,
        adminUser
      );

      // Assert
      expect(mockTopicRepository.findLatestVersion).toHaveBeenCalledWith(
        'new-topic-id'
      );
    });

    it('should check for URL conflicts when URL or topic changes', async () => {
      // Arrange
      const updateWithNewUrl: UpdateResourceDto = {
        url: 'https://example.com/different-url',
      };

      mockResourceRepository.findById.mockResolvedValue(sampleResource);
      mockResourceRepository.existsByTopicAndUrl.mockResolvedValue(true);

      // Act & Assert
      await expect(
        resourceService.updateResource(
          sampleResource.id,
          updateWithNewUrl,
          adminUser
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getResource', () => {
    it('should retrieve resource successfully', async () => {
      // Arrange
      mockResourceRepository.findById.mockResolvedValue(sampleResource);

      // Act
      const result = await resourceService.getResource(
        sampleResource.id,
        adminUser
      );

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          id: sampleResource.id,
          url: sampleResource.url,
        })
      );
    });

    it('should return null when resource not found', async () => {
      // Arrange
      mockResourceRepository.findById.mockResolvedValue(null);

      // Act
      const result = await resourceService.getResource(
        'non-existent-id',
        adminUser
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should allow viewers to read resources', async () => {
      // Arrange - mock the repository to return our sample resource
      mockResourceRepository.findById.mockResolvedValue(sampleResource);

      // Act
      const result = await resourceService.getResource(sampleResource.id, viewerUser);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(sampleResource.id);
    });
  });

  describe('getResourcesByTopic', () => {
    it('should retrieve resources for a topic', async () => {
      // Arrange
      const resources = [sampleResource];
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockResourceRepository.findByTopicId.mockResolvedValue(resources);

      // Act
      const result = await resourceService.getResourcesByTopic(
        sampleTopic.id,
        adminUser
      );

      // Assert
      expect(mockResourceRepository.findByTopicId).toHaveBeenCalledWith(
        sampleTopic.id
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(sampleResource.id);
    });

    it('should throw ValidationError when topic not found', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      // Act & Assert
      await expect(
        resourceService.getResourcesByTopic('non-existent-topic', adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getResourcesByType', () => {
    it('should retrieve resources by type', async () => {
      // Arrange
      const resources = [sampleResource];
      mockResourceRepository.findByType.mockResolvedValue(resources);

      // Act
      const result = await resourceService.getResourcesByType(
        ResourceType.ARTICLE,
        adminUser
      );

      // Assert
      expect(mockResourceRepository.findByType).toHaveBeenCalledWith(
        ResourceType.ARTICLE
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('deleteResource', () => {
    it('should delete resource successfully with admin user', async () => {
      // Arrange
      mockResourceRepository.findById.mockResolvedValue(sampleResource);
      mockResourceRepository.delete.mockResolvedValue(true);

      // Act
      const result = await resourceService.deleteResource(
        sampleResource.id,
        adminUser
      );

      // Assert
      expect(mockResourceRepository.delete).toHaveBeenCalledWith(
        sampleResource.id
      );
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedError for editor user', async () => {
      // Act & Assert
      await expect(
        resourceService.deleteResource(sampleResource.id, editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError when resource not found', async () => {
      // Arrange
      mockResourceRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        resourceService.deleteResource('non-existent-id', adminUser)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('searchResources', () => {
    it('should search resources by description', async () => {
      // Arrange
      const searchTerm = 'test';
      const resources = [sampleResource];
      mockResourceRepository.findByDescription.mockResolvedValue(resources);

      // Act
      const result = await resourceService.searchResources(
        searchTerm,
        adminUser
      );

      // Assert
      expect(mockResourceRepository.findByDescription).toHaveBeenCalledWith(
        searchTerm
      );
      expect(result.resources).toHaveLength(1);
      expect(result.searchTerm).toBe(searchTerm);
    });

    it('should filter by resource type when specified', async () => {
      // Arrange
      const searchTerm = 'test';
      const videoResource = new Resource({
        topicId: sampleTopic.id,
        url: 'https://example.com/video',
        description: 'Test video',
        type: ResourceType.VIDEO,
      });
      const resources = [sampleResource, videoResource];
      mockResourceRepository.findByDescription.mockResolvedValue(resources);

      // Act
      const result = await resourceService.searchResources(
        searchTerm,
        adminUser,
        ResourceType.VIDEO
      );

      // Assert
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].type).toBe(ResourceType.VIDEO);
      expect(result.filterType).toBe(ResourceType.VIDEO);
    });

    it('should throw ValidationError for empty search term', async () => {
      // Act & Assert
      await expect(
        resourceService.searchResources('', adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getResourcesGroupedByTopic', () => {
    it('should group resources by topic', async () => {
      // Arrange
      const topicIds = [sampleTopic.id];
      const resources = [sampleResource];
      mockResourceRepository.findByTopicIds.mockResolvedValue(resources);
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);

      // Act
      const result = await resourceService.getResourcesGroupedByTopic(
        topicIds,
        adminUser
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].topicId).toBe(sampleTopic.id);
      expect(result[0].topicName).toBe(sampleTopic.name);
      expect(result[0].resources).toHaveLength(1);
    });

    it('should return empty array for empty topic IDs', async () => {
      // Act
      const result = await resourceService.getResourcesGroupedByTopic(
        [],
        adminUser
      );

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should exclude deleted topics from results', async () => {
      // Arrange
      const topicIds = [sampleTopic.id];
      const resources = [sampleResource];
      mockResourceRepository.findByTopicIds.mockResolvedValue(resources);
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(true);

      // Act
      const result = await resourceService.getResourcesGroupedByTopic(
        topicIds,
        adminUser
      );

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('getRecentResources', () => {
    it('should retrieve recent resources with valid limit', async () => {
      // Arrange
      const limit = 10;
      const resources = [sampleResource];
      mockResourceRepository.findMostRecent.mockResolvedValue(resources);

      // Act
      const result = await resourceService.getRecentResources(limit, adminUser);

      // Assert
      expect(mockResourceRepository.findMostRecent).toHaveBeenCalledWith(limit);
      expect(result).toHaveLength(1);
    });

    it('should throw ValidationError for invalid limit', async () => {
      // Act & Assert
      await expect(
        resourceService.getRecentResources(0, adminUser)
      ).rejects.toThrow(ValidationError);

      await expect(
        resourceService.getRecentResources(101, adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('validateResourceAssociation', () => {
    it('should validate valid resource association', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockResourceRepository.existsByTopicAndUrl.mockResolvedValue(false);

      // Act
      const result = await resourceService.validateResourceAssociation(
        sampleTopic.id,
        'https://example.com/valid-url',
        adminUser
      );

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should detect invalid URL format', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);

      // Act
      const result = await resourceService.validateResourceAssociation(
        sampleTopic.id,
        'ht tp://invalid url with spaces',
        adminUser
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Invalid URL format');
    });

    it('should detect existing resource with same URL', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockResourceRepository.existsByTopicAndUrl.mockResolvedValue(true);

      // Act
      const result = await resourceService.validateResourceAssociation(
        sampleTopic.id,
        'https://example.com/existing-url',
        adminUser
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('already exists');
    });

    it('should return error when topic not found', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      // Act
      const result = await resourceService.validateResourceAssociation(
        'non-existent-topic',
        'https://example.com/url',
        adminUser
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Topic not found');
    });
  });
});

describe('ResourceService', () => {
  let resourceService: ResourceService;
  let adminUser: User;
  let editorUser: User;
  let viewerUser: User;
  let sampleResource: Resource;
  let sampleTopic: Topic;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create service instance
    resourceService = new ResourceService(
      mockResourceRepository,
      mockTopicRepository
    );

    // Create test users
    adminUser = new User({
      name: 'Admin User',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
    });

    editorUser = new User({
      name: 'Editor User',
      email: 'editor@test.com',
      role: UserRole.EDITOR,
    });

    viewerUser = new User({
      name: 'Viewer User',
      email: 'viewer@test.com',
      role: UserRole.VIEWER,
    });

    // Create sample entities
    sampleTopic = new Topic({
      name: 'Test Topic',
      content: 'Test content',
      id: 'topic-1',
    });

    sampleResource = new Resource({
      topicId: 'topic-1',
      url: 'https://example.com/resource',
      description: 'Test resource',
      type: ResourceType.ARTICLE,
      id: 'resource-1',
    });
  });

  describe('createResource', () => {
    const createResourceData: CreateResourceDto = {
      topicId: 'topic-1',
      url: 'https://example.com/new-resource',
      description: 'New test resource',
      type: ResourceType.VIDEO,
    };

    beforeEach(() => {
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockResourceRepository.existsByTopicAndUrl.mockResolvedValue(false);
    });

    it('should create resource successfully with admin user', async () => {
      mockResourceRepository.create.mockResolvedValue(sampleResource);

      const result = await resourceService.createResource(
        createResourceData,
        adminUser
      );

      expect(mockResourceRepository.create).toHaveBeenCalledWith(
        expect.any(Resource)
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: sampleResource.id,
          topicId: sampleResource.topicId,
          url: sampleResource.url,
        })
      );
    });

    it('should create resource successfully with editor user', async () => {
      mockResourceRepository.create.mockResolvedValue(sampleResource);

      const result = await resourceService.createResource(
        createResourceData,
        editorUser
      );

      expect(mockResourceRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw UnauthorizedError for viewer user', async () => {
      await expect(
        resourceService.createResource(createResourceData, viewerUser)
      ).rejects.toThrow(UnauthorizedError);

      expect(mockResourceRepository.create).not.toHaveBeenCalled();
    });

    it('should validate topic exists', async () => {
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      await expect(
        resourceService.createResource(createResourceData, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should prevent creating resource for deleted topic', async () => {
      mockTopicRepository.isDeleted.mockResolvedValue(true);

      await expect(
        resourceService.createResource(createResourceData, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should prevent duplicate URLs in same topic', async () => {
      mockResourceRepository.existsByTopicAndUrl.mockResolvedValue(true);

      await expect(
        resourceService.createResource(createResourceData, adminUser)
      ).rejects.toThrow(ConflictError);
    });

    it('should validate required fields', async () => {
      const invalidData: CreateResourceDto = {
        topicId: '',
        url: '',
        description: 'Valid description',
        type: ResourceType.ARTICLE,
      };

      await expect(
        resourceService.createResource(invalidData, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate URL length', async () => {
      const invalidData: CreateResourceDto = {
        topicId: 'topic-1',
        url: 'https://example.com/' + 'a'.repeat(2050),
        description: 'Valid description',
        type: ResourceType.ARTICLE,
      };

      await expect(
        resourceService.createResource(invalidData, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate description length', async () => {
      const invalidData: CreateResourceDto = {
        topicId: 'topic-1',
        url: 'https://example.com/valid',
        description: 'a'.repeat(1001),
        type: ResourceType.ARTICLE,
      };

      await expect(
        resourceService.createResource(invalidData, adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateResource', () => {
    const updateData: UpdateResourceDto = {
      url: 'https://example.com/updated-resource',
      description: 'Updated description',
    };

    beforeEach(() => {
      mockResourceRepository.findById.mockResolvedValue(sampleResource);
      mockResourceRepository.existsByTopicAndUrl.mockResolvedValue(false);
      mockResourceRepository.update.mockResolvedValue(sampleResource);
    });

    it('should update resource successfully with admin user', async () => {
      const result = await resourceService.updateResource(
        'resource-1',
        updateData,
        adminUser
      );

      expect(mockResourceRepository.update).toHaveBeenCalledWith(
        'resource-1',
        expect.any(Resource)
      );
      expect(result).toBeDefined();
    });

    it('should throw UnauthorizedError for viewer user', async () => {
      await expect(
        resourceService.updateResource('resource-1', updateData, viewerUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError for non-existent resource', async () => {
      mockResourceRepository.findById.mockResolvedValue(null);

      await expect(
        resourceService.updateResource('non-existent', updateData, adminUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should validate topic when updating topicId', async () => {
      const updateWithTopic: UpdateResourceDto = {
        topicId: 'new-topic',
      };

      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      await expect(
        resourceService.updateResource('resource-1', updateWithTopic, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should prevent URL conflicts when updating', async () => {
      const updateWithUrl: UpdateResourceDto = {
        url: 'https://example.com/conflicting-url',
      };

      mockResourceRepository.existsByTopicAndUrl.mockResolvedValue(true);

      await expect(
        resourceService.updateResource('resource-1', updateWithUrl, adminUser)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getResource', () => {
    beforeEach(() => {
      mockResourceRepository.findById.mockResolvedValue(sampleResource);
    });

    it('should get resource successfully', async () => {
      const result = await resourceService.getResource('resource-1', adminUser);

      expect(mockResourceRepository.findById).toHaveBeenCalledWith(
        'resource-1'
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: sampleResource.id,
          topicId: sampleResource.topicId,
        })
      );
    });

    it('should return null for non-existent resource', async () => {
      mockResourceRepository.findById.mockResolvedValue(null);

      const result = await resourceService.getResource(
        'non-existent',
        adminUser
      );

      expect(result).toBeNull();
    });

    it('should allow viewer to read resource', async () => {
      const result = await resourceService.getResource(
        'resource-1',
        viewerUser
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: sampleResource.id,
          topicId: sampleResource.topicId,
        })
      );
    });
  });

  describe('getResourcesByTopic', () => {
    beforeEach(() => {
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockResourceRepository.findByTopicId.mockResolvedValue([sampleResource]);
    });

    it('should get resources by topic successfully', async () => {
      const result = await resourceService.getResourcesByTopic(
        'topic-1',
        adminUser
      );

      expect(mockResourceRepository.findByTopicId).toHaveBeenCalledWith(
        'topic-1'
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: sampleResource.id,
          topicId: sampleResource.topicId,
        })
      );
    });

    it('should validate topic exists', async () => {
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      await expect(
        resourceService.getResourcesByTopic('non-existent', adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteResource', () => {
    beforeEach(() => {
      mockResourceRepository.findById.mockResolvedValue(sampleResource);
      mockResourceRepository.delete.mockResolvedValue(true);
    });

    it('should delete resource successfully with admin user', async () => {
      const result = await resourceService.deleteResource(
        'resource-1',
        adminUser
      );

      expect(mockResourceRepository.delete).toHaveBeenCalledWith('resource-1');
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedError for editor user', async () => {
      await expect(
        resourceService.deleteResource('resource-1', editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError for non-existent resource', async () => {
      mockResourceRepository.findById.mockResolvedValue(null);

      await expect(
        resourceService.deleteResource('non-existent', adminUser)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('searchResources', () => {
    beforeEach(() => {
      mockResourceRepository.findByDescription.mockResolvedValue([
        sampleResource,
      ]);
    });

    it('should search resources by description', async () => {
      const result = await resourceService.searchResources('test', adminUser);

      expect(mockResourceRepository.findByDescription).toHaveBeenCalledWith(
        'test'
      );
      expect(result.resources).toHaveLength(1);
      expect(result.searchTerm).toBe('test');
      expect(result.totalCount).toBe(1);
    });

    it('should filter by resource type', async () => {
      const result = await resourceService.searchResources(
        'test',
        adminUser,
        ResourceType.ARTICLE
      );

      expect(result.filterType).toBe(ResourceType.ARTICLE);
    });

    it('should throw ValidationError for empty search term', async () => {
      await expect(
        resourceService.searchResources('', adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getRecentResources', () => {
    beforeEach(() => {
      mockResourceRepository.findMostRecent.mockResolvedValue([sampleResource]);
    });

    it('should get recent resources successfully', async () => {
      const result = await resourceService.getRecentResources(10, adminUser);

      expect(mockResourceRepository.findMostRecent).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(1);
    });

    it('should validate limit range', async () => {
      await expect(
        resourceService.getRecentResources(0, adminUser)
      ).rejects.toThrow(ValidationError);

      await expect(
        resourceService.getRecentResources(101, adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('validateResourceAssociation', () => {
    beforeEach(() => {
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockResourceRepository.existsByTopicAndUrl.mockResolvedValue(false);
    });

    it('should validate valid resource association', async () => {
      const result = await resourceService.validateResourceAssociation(
        'topic-1',
        'https://example.com/valid-url',
        adminUser
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid topic', async () => {
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      const result = await resourceService.validateResourceAssociation(
        'invalid-topic',
        'https://example.com/valid-url',
        adminUser
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Topic not found or is deleted');
    });

    it('should reject invalid URL format', async () => {
      const result = await resourceService.validateResourceAssociation(
        'topic-1',
        'ht tp://invalid url with spaces',
        adminUser
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid URL format');
    });

    it('should reject duplicate URL', async () => {
      mockResourceRepository.existsByTopicAndUrl.mockResolvedValue(true);

      const result = await resourceService.validateResourceAssociation(
        'topic-1',
        'https://example.com/existing-url',
        adminUser
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe(
        'Resource with this URL already exists for this topic'
      );
    });
  });
});
