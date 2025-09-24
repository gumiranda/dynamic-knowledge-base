import { TopicService } from '../TopicService';
import { Topic } from '../../../domain/entities/Topic';
import { User } from '../../../domain/entities/User';
import { UserRole } from '../../../domain/enums/UserRole';
import { ITopicRepository } from '../../../domain/repositories/ITopicRepository';
import { ITopicVersionFactory } from '../../../domain/factories/ITopicVersionFactory';
import { ValidationError, UnauthorizedError } from '../../errors/AppError';
import { CreateTopicDto } from '../../dtos/TopicDto';

// Simple mock implementations
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

describe('TopicService - Basic Tests', () => {
  let topicService: TopicService;
  let adminUser: User;
  let viewerUser: User;

  beforeEach(() => {
    jest.clearAllMocks();
    topicService = new TopicService(mockTopicRepository, mockVersionFactory);

    adminUser = new User({
      name: 'Admin User',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
    });

    viewerUser = new User({
      name: 'Viewer User',
      email: 'viewer@test.com',
      role: UserRole.VIEWER,
    });
  });

  describe('createTopic', () => {
    it('should create topic with admin user', async () => {
      const createData: CreateTopicDto = {
        name: 'Test Topic',
        content: 'Test content',
      };

      const sampleTopic = new Topic({
        name: 'Test Topic',
        content: 'Test content',
        id: 'topic-1',
      });

      mockTopicRepository.create.mockResolvedValue(sampleTopic);

      const result = await topicService.createTopic(createData, adminUser);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Topic');
      expect(mockTopicRepository.create).toHaveBeenCalled();
    });

    it('should reject viewer user', async () => {
      const createData: CreateTopicDto = {
        name: 'Test Topic',
        content: 'Test content',
      };

      await expect(
        topicService.createTopic(createData, viewerUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should validate empty name', async () => {
      const createData: CreateTopicDto = {
        name: '',
        content: 'Test content',
      };

      await expect(
        topicService.createTopic(createData, adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getTopic', () => {
    it('should get topic successfully', async () => {
      const sampleTopic = new Topic({
        name: 'Test Topic',
        content: 'Test content',
        id: 'topic-1',
      });

      mockTopicRepository.findLatestVersion.mockResolvedValue(sampleTopic);
      mockTopicRepository.isDeleted.mockResolvedValue(false);

      const result = await topicService.getTopic(
        'topic-1',
        undefined,
        adminUser
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe('Test Topic');
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
  });
});
