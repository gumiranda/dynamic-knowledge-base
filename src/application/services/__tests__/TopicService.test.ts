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
      expect(result).toEqual(
        expect.objectContaining({
          name: sampleTopic.name,
          content: sampleTopic.content,
        })
      );
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
        name: validUpdateDto.name || sampleTopic.name,
        content: validUpdateDto.content || sampleTopic.content,
        version: 2,
      });

      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);
      mockVersionFactory.createNewVersion.mockReturnValue(updatedTopic);
      mockTopicRepository.create.mockResolvedValue(updatedTopic);

      // Act
      const result = await topicService.updateTopic(
        'topic-1',
        validUpdateDto,
        adminUser
      );

      // Assert
      expect(mockVersionFactory.createNewVersion).toHaveBeenCalledWith(
        sampleTopic,
        validUpdateDto
      );
      expect(mockTopicRepository.create).toHaveBeenCalledWith(updatedTopic);
      expect(result).toEqual(
        expect.objectContaining({
          name: updatedTopic.name,
          content: updatedTopic.content,
        })
      );
    });

    it('should throw UnauthorizedError for viewer user', async () => {
      // Act & Assert
      await expect(
        topicService.updateTopic('topic-1', validUpdateDto, viewerUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError for non-existent topic', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      // Act & Assert
      await expect(
        topicService.updateTopic('non-existent', validUpdateDto, adminUser)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getTopic', () => {
    it('should retrieve topic successfully', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);

      // Act
      const result = await topicService.getTopic(
        'topic-1',
        undefined,
        adminUser
      );

      // Assert
      expect(mockTopicRepository.findLatestVersion).toHaveBeenCalledWith(
        'topic-1'
      );
      expect(result).toEqual(
        expect.objectContaining({
          name: sampleTopic.name,
          content: sampleTopic.content,
        })
      );
    });

    it('should return null for non-existent topic', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      // Act
      const result = await topicService.getTopic(
        'topic-1',
        undefined,
        adminUser
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('deleteTopic', () => {
    it('should delete topic successfully with admin user', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.softDelete.mockResolvedValue(true);

      // Act
      const result = await topicService.deleteTopic('topic-1', adminUser);

      // Assert
      expect(mockTopicRepository.softDelete).toHaveBeenCalledWith('topic-1');
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedError for editor user', async () => {
      // Act & Assert
      await expect(
        topicService.deleteTopic('topic-1', editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('searchTopics', () => {
    it('should search topics by name and content', async () => {
      // Arrange
      mockTopicRepository.findByName.mockResolvedValue([sampleTopic]);
      mockTopicRepository.findByContent.mockResolvedValue([]);

      // Act
      const result = await topicService.searchTopics('Test', adminUser);

      // Assert
      expect(mockTopicRepository.findByName).toHaveBeenCalledWith('Test');
      expect(mockTopicRepository.findByContent).toHaveBeenCalledWith('Test');
      expect(result.topics).toEqual([
        expect.objectContaining({
          name: sampleTopic.name,
        }),
      ]);
    });

    it('should throw ValidationError for empty search term', async () => {
      // Act & Assert
      await expect(topicService.searchTopics('', adminUser)).rejects.toThrow(
        ValidationError
      );
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
      mockTopicRepository.findByParentId.mockResolvedValue([childTopic]);

      // Act
      const result = await topicService.getTopicHierarchy('topic-1', adminUser);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          topic: expect.objectContaining({
            name: sampleTopic.name,
          }),
          children: expect.arrayContaining([
            expect.objectContaining({
              topic: expect.objectContaining({
                name: childTopic.name,
              }),
              children: [],
            }),
          ]),
        })
      );
    });

    it('should throw NotFoundError for non-existent topic', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      // Act & Assert
      await expect(
        topicService.getTopicHierarchy('non-existent', adminUser)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getRootTopics', () => {
    it('should return all root topics excluding deleted ones', async () => {
      // Arrange
      mockTopicRepository.findRootTopics.mockResolvedValue([sampleTopic]);

      // Act
      const result = await topicService.getRootTopics(adminUser);

      // Assert
      expect(mockTopicRepository.findRootTopics).toHaveBeenCalled();
      expect(result).toEqual([
        expect.objectContaining({
          name: sampleTopic.name,
        }),
      ]);
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
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      // Act
      const result = await topicService.getOrphanedTopics(adminUser);

      // Assert
      expect(result).toEqual([
        expect.objectContaining({
          name: orphanedTopic.name,
        }),
      ]);
    });
  });

  describe('validateParentChildRelationship', () => {
    it('should validate valid parent-child relationship', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(sampleTopic) // child
        .mockResolvedValueOnce(parentTopic); // parent

      // Act
      const result = await topicService.validateParentChildRelationship(
        sampleTopic.id,
        parentTopic.id,
        adminUser
      );

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should detect when child topic does not exist', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(null) // child not found
        .mockResolvedValueOnce(parentTopic);

      // Act
      const result = await topicService.validateParentChildRelationship(
        'non-existent',
        'parent-1',
        adminUser
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Child topic not found');
    });
  });
});
