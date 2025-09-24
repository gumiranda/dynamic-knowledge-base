import { TopicService } from '../TopicService';
import { Topic } from '../../../domain/entities/Topic';
import { User } from '../../../domain/entities/User';
import { UserRole } from '../../../domain/enums/UserRole';
import { ITopicRepository } from '../../../domain/repositories/ITopicRepository';
import { ITopicVersionFactory } from '../../../domain/factories/ITopicVersionFactory';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '../../errors/AppError';
import { CreateTopicDto, UpdateTopicDto } from '../../dtos/TopicDto';

// Mock implementations
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

const mockVersionFactory: jest.Mocked<ITopicVersionFactory> = {
  createNewVersion: jest.fn(),
  createContentVersion: jest.fn(),
  createNameVersion: jest.fn(),
  createParentVersion: jest.fn(),
};

describe('TopicService', () => {
  let topicService: TopicService;
  let adminUser: User;
  let editorUser: User;
  let viewerUser: User;
  let sampleTopic: Topic;
  let parentTopic: Topic;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize service
    topicService = new TopicService(mockTopicRepository, mockVersionFactory);

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

    // Create test topics
    sampleTopic = new Topic({
      name: 'Sample Topic',
      content: 'Sample content',
    });

    parentTopic = new Topic({
      name: 'Parent Topic',
      content: 'Parent content',
    });
  });

  describe('createTopic', () => {
    const validCreateDto: CreateTopicDto = {
      name: 'New Topic',
      content: 'New content',
    };

    it('should create topic successfully with admin user', async () => {
      // Arrange
      mockTopicRepository.create.mockResolvedValue(sampleTopic);

      // Act
      const result = await topicService.createTopic(validCreateDto, adminUser);

      // Assert
      expect(mockTopicRepository.create).toHaveBeenCalledWith(
        expect.any(Topic)
      );
      expect(result).toEqual(expect.objectContaining({
        id: sampleTopic.id,
        name: sampleTopic.name,
        content: sampleTopic.content,
      }));
    });

    it('should create topic successfully with editor user', async () => {
      // Arrange
      mockTopicRepository.create.mockResolvedValue(sampleTopic);

      // Act
      const result = await topicService.createTopic(validCreateDto, editorUser);

      // Assert
      expect(mockTopicRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw UnauthorizedError for viewer user', async () => {
      // Act & Assert
      await expect(
        topicService.createTopic(validCreateDto, viewerUser)
      ).rejects.toThrow(UnauthorizedError);
      expect(mockTopicRepository.create).not.toHaveBeenCalled();
    });

    it('should validate parent topic exists when parentTopicId provided', async () => {
      // Arrange
      const createDtoWithParent: CreateTopicDto = {
        ...validCreateDto,
        parentTopicId: parentTopic.id,
      };
      mockTopicRepository.findLatestVersion.mockResolvedValue(parentTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockTopicRepository.create.mockResolvedValue(sampleTopic);

      // Act
      await topicService.createTopic(createDtoWithParent, adminUser);

      // Assert
      expect(mockTopicRepository.findLatestVersion).toHaveBeenCalledWith(
        parentTopic.id
      );
      expect(mockTopicRepository.isDeleted).toHaveBeenCalledWith(
        parentTopic.id
      );
    });

    it('should throw ValidationError when parent topic not found', async () => {
      // Arrange
      const createDtoWithParent: CreateTopicDto = {
        ...validCreateDto,
        parentTopicId: 'non-existent-id',
      };
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      // Act & Assert
      await expect(
        topicService.createTopic(createDtoWithParent, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when parent topic is deleted', async () => {
      // Arrange
      const createDtoWithParent: CreateTopicDto = {
        ...validCreateDto,
        parentTopicId: parentTopic.id,
      };
      mockTopicRepository.findLatestVersion.mockResolvedValue(parentTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(true);

      // Act & Assert
      await expect(
        topicService.createTopic(createDtoWithParent, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for empty topic name', async () => {
      // Arrange
      const invalidDto: CreateTopicDto = {
        name: '',
        content: 'Valid content',
      };

      // Act & Assert
      await expect(
        topicService.createTopic(invalidDto, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for topic name exceeding 200 characters', async () => {
      // Arrange
      const invalidDto: CreateTopicDto = {
        name: 'a'.repeat(201),
        content: 'Valid content',
      };

      // Act & Assert
      await expect(
        topicService.createTopic(invalidDto, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for content exceeding 10000 characters', async () => {
      // Arrange
      const invalidDto: CreateTopicDto = {
        name: 'Valid name',
        content: 'a'.repeat(10001),
      };

      // Act & Assert
      await expect(
        topicService.createTopic(invalidDto, adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateTopic', () => {
    const validUpdateDto: UpdateTopicDto = {
      name: 'Updated Topic',
      content: 'Updated content',
    };

    it('should update topic successfully with admin user', async () => {
      // Arrange
      const updatedTopic = new Topic({
        ...sampleTopic,
        name: validUpdateDto.name,
        content: validUpdateDto.content,
        version: 2,
      });

      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockVersionFactory.createNewVersion.mockReturnValue(updatedTopic);
      mockTopicRepository.create.mockResolvedValue(updatedTopic);

      // Act
      const result = await topicService.updateTopic(
        sampleTopic.id,
        validUpdateDto,
        adminUser
      );

      // Assert
      expect(mockVersionFactory.createNewVersion).toHaveBeenCalledWith(
        sampleTopic,
        validUpdateDto
      );
      expect(mockTopicRepository.create).toHaveBeenCalledWith(updatedTopic);
      expect(result.version).toBe(2);
    });

    it('should throw UnauthorizedError for viewer user', async () => {
      // Act & Assert
      await expect(
        topicService.updateTopic(sampleTopic.id, validUpdateDto, viewerUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError when topic not found', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      // Act & Assert
      await expect(
        topicService.updateTopic('non-existent-id', validUpdateDto, adminUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when topic is deleted', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(true);

      // Act & Assert
      await expect(
        topicService.updateTopic(sampleTopic.id, validUpdateDto, adminUser)
      ).rejects.toThrow(ConflictError);
    });

    it('should validate circular reference when updating parent', async () => {
      // Arrange
      const updateWithParent: UpdateTopicDto = {
        parentTopicId: 'child-topic-id',
      };

      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(sampleTopic) // For the topic being updated
        .mockResolvedValueOnce(parentTopic); // For the new parent
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockTopicRepository.findByParentId.mockResolvedValue([
        new Topic({ name: 'Child', content: 'Child content' }),
      ]);

      // Mock getAllDescendantIds to return the new parent ID (simulating circular reference)
      jest.spyOn(topicService as any, 'getAllDescendantIds').mockResolvedValue([
        'child-topic-id',
      ]);

      // Act & Assert
      await expect(
        topicService.updateTopic(sampleTopic.id, updateWithParent, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should prevent topic from being its own parent', async () => {
      // Arrange
      const updateWithSelfParent: UpdateTopicDto = {
        parentTopicId: sampleTopic.id,
      };

      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);

      // Act & Assert
      await expect(
        topicService.updateTopic(sampleTopic.id, updateWithSelfParent, adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getTopic', () => {
    it('should retrieve topic successfully', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);

      // Act
      const result = await topicService.getTopic(sampleTopic.id, undefined, adminUser);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: sampleTopic.id,
        name: sampleTopic.name,
      }));
    });

    it('should retrieve specific version when version number provided', async () => {
      // Arrange
      const version2Topic = new Topic({
        ...sampleTopic,
        version: 2,
      });
      mockTopicRepository.findByVersion.mockResolvedValue(version2Topic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);

      // Act
      const result = await topicService.getTopic(sampleTopic.id, 2, adminUser);

      // Assert
      expect(mockTopicRepository.findByVersion).toHaveBeenCalledWith(
        sampleTopic.id,
        2
      );
      expect(result?.version).toBe(2);
    });

    it('should return null when topic not found', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      // Act
      const result = await topicService.getTopic('non-existent-id', undefined, adminUser);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when topic is deleted', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(true);

      // Act
      const result = await topicService.getTopic(sampleTopic.id, undefined, adminUser);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw UnauthorizedError for viewer without permissions', async () => {
      // Act & Assert
      await expect(
        topicService.getTopic(sampleTopic.id, undefined, viewerUser)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('deleteTopic', () => {
    it('should delete topic successfully with admin user', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockTopicRepository.softDelete.mockResolvedValue(true);

      // Act
      const result = await topicService.deleteTopic(sampleTopic.id, adminUser);

      // Assert
      expect(mockTopicRepository.softDelete).toHaveBeenCalledWith(sampleTopic.id);
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedError for editor user', async () => {
      // Act & Assert
      await expect(
        topicService.deleteTopic(sampleTopic.id, editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError when topic not found', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      // Act & Assert
      await expect(
        topicService.deleteTopic('non-existent-id', adminUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when topic already deleted', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(true);

      // Act & Assert
      await expect(
        topicService.deleteTopic(sampleTopic.id, adminUser)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('searchTopics', () => {
    it('should search topics by name and content', async () => {
      // Arrange
      const searchTerm = 'test';
      const nameResults = [sampleTopic];
      const contentResults = [parentTopic];

      mockTopicRepository.findByName.mockResolvedValue(nameResults);
      mockTopicRepository.findByContent.mockResolvedValue(contentResults);
      mockTopicRepository.isDeleted.mockResolvedValue(false);

      // Act
      const result = await topicService.searchTopics(searchTerm, adminUser);

      // Assert
      expect(mockTopicRepository.findByName).toHaveBeenCalledWith(searchTerm);
      expect(mockTopicRepository.findByContent).toHaveBeenCalledWith(searchTerm);
      expect(result.topics).toHaveLength(2);
      expect(result.searchTerm).toBe(searchTerm);
    });

    it('should deduplicate search results', async () => {
      // Arrange
      const searchTerm = 'test';
      const duplicateResults = [sampleTopic, sampleTopic];

      mockTopicRepository.findByName.mockResolvedValue(duplicateResults);
      mockTopicRepository.findByContent.mockResolvedValue([]);
      mockTopicRepository.isDeleted.mockResolvedValue(false);

      // Act
      const result = await topicService.searchTopics(searchTerm, adminUser);

      // Assert
      expect(result.topics).toHaveLength(1);
    });

    it('should throw ValidationError for empty search term', async () => {
      // Act & Assert
      await expect(
        topicService.searchTopics('', adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should filter out deleted topics from search results', async () => {
      // Arrange
      const searchTerm = 'test';
      mockTopicRepository.findByName.mockResolvedValue([sampleTopic]);
      mockTopicRepository.findByContent.mockResolvedValue([]);
      mockTopicRepository.isDeleted.mockResolvedValue(true);

      // Act
      const result = await topicService.searchTopics(searchTerm, adminUser);

      // Assert
      expect(result.topics).toHaveLength(0);
    });
  });

  describe('getTopicHierarchy', () => {
    it('should build topic hierarchy recursively', async () => {
      // Arrange
      const childTopic = new Topic({
        name: 'Child Topic',
        content: 'Child content',
        parentTopicId: sampleTopic.id,
      });

      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockTopicRepository.findByParentId
        .mockResolvedValueOnce([childTopic])
        .mockResolvedValueOnce([]); // No children for child topic

      // Act
      const result = await topicService.getTopicHierarchy(sampleTopic.id, adminUser);

      // Assert
      expect(result.topic.id).toBe(sampleTopic.id);
      expect(result.children).toHaveLength(1);
      expect(result.children[0].topic.id).toBe(childTopic.id);
    });

    it('should respect max depth limit', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);

      // Act
      const result = await topicService.getTopicHierarchy(sampleTopic.id, adminUser, 0);

      // Assert
      expect(result.children).toHaveLength(0);
      expect(result.depth).toBe(0);
    });

    it('should throw NotFoundError when root topic not found', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      // Act & Assert
      await expect(
        topicService.getTopicHierarchy('non-existent-id', adminUser)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getRootTopics', () => {
    it('should return all root topics excluding deleted ones', async () => {
      // Arrange
      const rootTopics = [sampleTopic, parentTopic];
      mockTopicRepository.findRootTopics.mockResolvedValue(rootTopics);
      mockTopicRepository.isDeleted
        .mockResolvedValueOnce(false) // sampleTopic not deleted
        .mockResolvedValueOnce(true); // parentTopic deleted

      // Act
      const result = await topicService.getRootTopics(adminUser);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(sampleTopic.id);
    });
  });

  describe('getOrphanedTopics', () => {
    it('should find topics with non-existent parents', async () => {
      // Arrange
      const orphanedTopic = new Topic({
        name: 'Orphaned Topic',
        content: 'Orphaned content',
        parentTopicId: 'non-existent-parent',
      });

      mockTopicRepository.findAll.mockResolvedValue([orphanedTopic]);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockTopicRepository.exists.mockResolvedValue(false);

      // Act
      const result = await topicService.getOrphanedTopics(adminUser);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(orphanedTopic.id);
    });

    it('should find topics with deleted parents', async () => {
      // Arrange
      const orphanedTopic = new Topic({
        name: 'Orphaned Topic',
        content: 'Orphaned content',
        parentTopicId: parentTopic.id,
      });

      mockTopicRepository.findAll.mockResolvedValue([orphanedTopic]);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockTopicRepository.exists.mockResolvedValue(true);
      mockTopicRepository.isDeleted
        .mockResolvedValueOnce(false) // orphanedTopic not deleted
        .mockResolvedValueOnce(true); // parent is deleted

      // Act
      const result = await topicService.getOrphanedTopics(adminUser);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('validateParentChildRelationship', () => {
    it('should validate valid parent-child relationship', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(sampleTopic) // child
        .mockResolvedValueOnce(parentTopic); // parent
      mockTopicRepository.isDeleted.mockResolvedValue(false);

      // Mock getAllDescendantIds to return empty array (no circular reference)
      jest.spyOn(topicService as any, 'getAllDescendantIds').mockResolvedValue([]);

      // Act
      const result = await topicService.validateParentChildRelationship(
        sampleTopic.id,
        parentTopic.id,
        adminUser
      );

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should detect circular reference', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(sampleTopic) // child
        .mockResolvedValueOnce(parentTopic); // parent
      mockTopicRepository.isDeleted.mockResolvedValue(false);

      // Mock getAllDescendantIds to return parent ID (circular reference)
      jest.spyOn(topicService as any, 'getAllDescendantIds').mockResolvedValue([
        parentTopic.id,
      ]);

      // Act
      const result = await topicService.validateParentChildRelationship(
        sampleTopic.id,
        parentTopic.id,
        adminUser
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('circular reference');
    });

    it('should detect self-reference', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);

      // Act
      const result = await topicService.validateParentChildRelationship(
        sampleTopic.id,
        sampleTopic.id,
        adminUser
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('own parent');
    });
  });
    // Reset all mocks
    jest.clearAllMocks();

    // Create service instance
    topicService = new TopicService(mockTopicRepository, mockVersionFactory);

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

    // Create sample topic
    sampleTopic = new Topic({
      name: 'Test Topic',
      content: 'Test content',
      id: 'topic-1',
      version: 1,
    });
  });

  describe('createTopic', () => {
    const createTopicData: CreateTopicDto = {
      name: 'New Topic',
      content: 'New content',
    };

    it('should create topic successfully with admin user', async () => {
      mockTopicRepository.create.mockResolvedValue(sampleTopic);

      const result = await topicService.createTopic(createTopicData, adminUser);

      expect(mockTopicRepository.create).toHaveBeenCalledWith(
        expect.any(Topic)
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: sampleTopic.id,
          name: sampleTopic.name,
          content: sampleTopic.content,
        })
      );
    });

    it('should create topic successfully with editor user', async () => {
      mockTopicRepository.create.mockResolvedValue(sampleTopic);

      const result = await topicService.createTopic(
        createTopicData,
        editorUser
      );

      expect(mockTopicRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw UnauthorizedError for viewer user', async () => {
      await expect(
        topicService.createTopic(createTopicData, viewerUser)
      ).rejects.toThrow(UnauthorizedError);

      expect(mockTopicRepository.create).not.toHaveBeenCalled();
    });

    it('should validate parent topic exists', async () => {
      const dataWithParent: CreateTopicDto = {
        ...createTopicData,
        parentTopicId: 'parent-1',
      };

      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      await expect(
        topicService.createTopic(dataWithParent, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should prevent creating topic under deleted parent', async () => {
      const dataWithParent: CreateTopicDto = {
        ...createTopicData,
        parentTopicId: 'parent-1',
      };

      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(true);

      await expect(
        topicService.createTopic(dataWithParent, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate topic name is required', async () => {
      const invalidData: CreateTopicDto = {
        name: '',
        content: 'Content',
      };

      await expect(
        topicService.createTopic(invalidData, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate topic name length', async () => {
      const invalidData: CreateTopicDto = {
        name: 'a'.repeat(201),
        content: 'Content',
      };

      await expect(
        topicService.createTopic(invalidData, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate content length', async () => {
      const invalidData: CreateTopicDto = {
        name: 'Valid Name',
        content: 'a'.repeat(10001),
      };

      await expect(
        topicService.createTopic(invalidData, adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateTopic', () => {
    const updateData: UpdateTopicDto = {
      name: 'Updated Topic',
      content: 'Updated content',
    };

    beforeEach(() => {
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
    });

    it('should update topic successfully with admin user', async () => {
      const updatedTopic = new Topic({
        ...sampleTopic,
        ...updateData,
        version: 2,
      });

      mockVersionFactory.createNewVersion.mockReturnValue(updatedTopic);
      mockTopicRepository.create.mockResolvedValue(updatedTopic);

      const result = await topicService.updateTopic(
        'topic-1',
        updateData,
        adminUser
      );

      expect(mockVersionFactory.createNewVersion).toHaveBeenCalledWith(
        sampleTopic,
        updateData
      );
      expect(mockTopicRepository.create).toHaveBeenCalledWith(updatedTopic);
      expect(result.version).toBe(2);
    });

    it('should throw UnauthorizedError for viewer user', async () => {
      await expect(
        topicService.updateTopic('topic-1', updateData, viewerUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError for non-existent topic', async () => {
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      await expect(
        topicService.updateTopic('non-existent', updateData, adminUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError for deleted topic', async () => {
      mockTopicRepository.isDeleted.mockResolvedValue(true);

      await expect(
        topicService.updateTopic('topic-1', updateData, adminUser)
      ).rejects.toThrow(ConflictError);
    });

    it('should validate parent topic when updating parent', async () => {
      const updateWithParent: UpdateTopicDto = {
        parentTopicId: 'new-parent',
      };

      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(sampleTopic) // For the topic being updated
        .mockResolvedValueOnce(null); // For the parent topic

      await expect(
        topicService.updateTopic('topic-1', updateWithParent, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should prevent self-reference as parent', async () => {
      const updateWithSelfParent: UpdateTopicDto = {
        parentTopicId: 'topic-1',
      };

      await expect(
        topicService.updateTopic('topic-1', updateWithSelfParent, adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getTopic', () => {
    beforeEach(() => {
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.findByVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
    });

    it('should get latest topic version', async () => {
      const result = await topicService.getTopic(
        'topic-1',
        undefined,
        adminUser
      );

      expect(mockTopicRepository.findLatestVersion).toHaveBeenCalledWith(
        'topic-1'
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: sampleTopic.id,
          name: sampleTopic.name,
        })
      );
    });

    it('should get specific topic version', async () => {
      const result = await topicService.getTopic('topic-1', 1, adminUser);

      expect(mockTopicRepository.findByVersion).toHaveBeenCalledWith(
        'topic-1',
        1
      );
      expect(result).toBeDefined();
    });

    it('should return null for non-existent topic', async () => {
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      const result = await topicService.getTopic(
        'non-existent',
        undefined,
        adminUser
      );

      expect(result).toBeNull();
    });

    it('should return null for deleted topic', async () => {
      mockTopicRepository.isDeleted.mockResolvedValue(true);

      const result = await topicService.getTopic(
        'topic-1',
        undefined,
        adminUser
      );

      expect(result).toBeNull();
    });

    it('should throw UnauthorizedError for viewer without permission', async () => {
      await expect(
        topicService.getTopic('topic-1', undefined, viewerUser)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('deleteTopic', () => {
    beforeEach(() => {
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockTopicRepository.softDelete.mockResolvedValue(true);
    });

    it('should delete topic successfully with admin user', async () => {
      const result = await topicService.deleteTopic('topic-1', adminUser);

      expect(mockTopicRepository.softDelete).toHaveBeenCalledWith('topic-1');
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedError for editor user', async () => {
      await expect(
        topicService.deleteTopic('topic-1', editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError for non-existent topic', async () => {
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      await expect(
        topicService.deleteTopic('non-existent', adminUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError for already deleted topic', async () => {
      mockTopicRepository.isDeleted.mockResolvedValue(true);

      await expect(
        topicService.deleteTopic('topic-1', adminUser)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getTopicHierarchy', () => {
    const childTopic = new Topic({
      name: 'Child Topic',
      content: 'Child content',
      parentTopicId: 'topic-1',
      id: 'child-1',
    });

    beforeEach(() => {
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockTopicRepository.findByParentId.mockResolvedValue([childTopic]);
    });

    it('should build topic hierarchy successfully', async () => {
      const result = await topicService.getTopicHierarchy('topic-1', adminUser);

      expect(result).toEqual(
        expect.objectContaining({
          topic: expect.objectContaining({
            id: sampleTopic.id,
            name: sampleTopic.name,
          }),
          children: expect.arrayContaining([
            expect.objectContaining({
              topic: expect.objectContaining({
                id: childTopic.id,
                name: childTopic.name,
              }),
            }),
          ]),
          depth: 0,
        })
      );
    });

    it('should respect max depth limit', async () => {
      const result = await topicService.getTopicHierarchy(
        'topic-1',
        adminUser,
        0
      );

      expect(result.children).toHaveLength(0);
      expect(result.depth).toBe(0);
    });

    it('should throw NotFoundError for non-existent topic', async () => {
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      await expect(
        topicService.getTopicHierarchy('non-existent', adminUser)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getRootTopics', () => {
    beforeEach(() => {
      mockTopicRepository.findRootTopics.mockResolvedValue([sampleTopic]);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
    });

    it('should get root topics successfully', async () => {
      const result = await topicService.getRootTopics(adminUser);

      expect(mockTopicRepository.findRootTopics).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: sampleTopic.id,
          name: sampleTopic.name,
        })
      );
    });

    it('should filter out deleted root topics', async () => {
      mockTopicRepository.isDeleted.mockResolvedValue(true);

      const result = await topicService.getRootTopics(adminUser);

      expect(result).toHaveLength(0);
    });
  });

  describe('getOrphanedTopics', () => {
    const orphanedTopic = new Topic({
      name: 'Orphaned Topic',
      content: 'Orphaned content',
      parentTopicId: 'non-existent-parent',
      id: 'orphaned-1',
    });

    beforeEach(() => {
      mockTopicRepository.findAll.mockResolvedValue([orphanedTopic]);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockTopicRepository.exists.mockResolvedValue(false);
    });

    it('should find orphaned topics', async () => {
      const result = await topicService.getOrphanedTopics(adminUser);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: orphanedTopic.id,
          name: orphanedTopic.name,
        })
      );
    });

    it('should not include root topics as orphaned', async () => {
      const rootTopic = new Topic({
        name: 'Root Topic',
        content: 'Root content',
        id: 'root-1',
      });

      mockTopicRepository.findAll.mockResolvedValue([rootTopic]);

      const result = await topicService.getOrphanedTopics(adminUser);

      expect(result).toHaveLength(0);
    });
  });

  describe('searchTopics', () => {
    beforeEach(() => {
      mockTopicRepository.findByName.mockResolvedValue([sampleTopic]);
      mockTopicRepository.findByContent.mockResolvedValue([]);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
    });

    it('should search topics by name', async () => {
      const result = await topicService.searchTopics('Test', adminUser);

      expect(mockTopicRepository.findByName).toHaveBeenCalledWith('Test');
      expect(result.topics).toHaveLength(1);
      expect(result.searchTerm).toBe('Test');
      expect(result.totalCount).toBe(1);
    });

    it('should throw ValidationError for empty search term', async () => {
      await expect(topicService.searchTopics('', adminUser)).rejects.toThrow(
        ValidationError
      );
    });

    it('should deduplicate search results', async () => {
      mockTopicRepository.findByName.mockResolvedValue([sampleTopic]);
      mockTopicRepository.findByContent.mockResolvedValue([sampleTopic]);

      const result = await topicService.searchTopics('Test', adminUser);

      expect(result.topics).toHaveLength(1);
    });
  });

  describe('validateParentChildRelationship', () => {
    const parentTopic = new Topic({
      name: 'Parent Topic',
      content: 'Parent content',
      id: 'parent-1',
    });

    beforeEach(() => {
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(sampleTopic) // child
        .mockResolvedValueOnce(parentTopic); // parent
      mockTopicRepository.isDeleted.mockResolvedValue(false);
    });

    it('should validate valid parent-child relationship', async () => {
      const result = await topicService.validateParentChildRelationship(
        'topic-1',
        'parent-1',
        adminUser
      );

      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject self-reference', async () => {
      const result = await topicService.validateParentChildRelationship(
        'topic-1',
        'topic-1',
        adminUser
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Topic cannot be its own parent');
    });

    it('should reject non-existent child', async () => {
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(null) // child not found
        .mockResolvedValueOnce(parentTopic);

      const result = await topicService.validateParentChildRelationship(
        'non-existent',
        'parent-1',
        adminUser
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Child topic not found');
    });
  });
});
});