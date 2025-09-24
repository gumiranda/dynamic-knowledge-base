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
