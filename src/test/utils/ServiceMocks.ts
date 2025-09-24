import { ITopicRepository } from '../../domain/repositories/ITopicRepository';
import { IResourceRepository } from '../../domain/repositories/IResourceRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { ITopicVersionFactory } from '../../domain/factories/ITopicVersionFactory';
import { TopicService } from '../../application/services/TopicService';
import { ResourceService } from '../../application/services/ResourceService';
import { UserService } from '../../application/services/UserService';
import { TopicPathFinder } from '../../application/services/TopicPathFinder';

/**
 * Factory for creating mocked services and repositories for testing
 */
export class ServiceMocks {
  /**
   * Creates a fully mocked TopicRepository
   */
  static createMockTopicRepository(): jest.Mocked<ITopicRepository> {
    return {
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
  }

  /**
   * Creates a fully mocked ResourceRepository
   */
  static createMockResourceRepository(): jest.Mocked<IResourceRepository> {
    return {
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
  }

  /**
   * Creates a fully mocked UserRepository
   */
  static createMockUserRepository(): jest.Mocked<IUserRepository> {
    return {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByEmail: jest.fn(),
      findByRole: jest.fn(),
      findByName: jest.fn(),
      existsByEmail: jest.fn(),
      existsByEmailExcluding: jest.fn(),
      countByRole: jest.fn(),
      findByDateRange: jest.fn(),
      findMostRecent: jest.fn(),
      findAdmins: jest.fn(),
      findEditors: jest.fn(),
      findViewers: jest.fn(),
      updateRole: jest.fn(),
      hasAdminUser: jest.fn(),
      getTotalCount: jest.fn(),
    };
  }

  /**
   * Creates a fully mocked TopicVersionFactory
   */
  static createMockTopicVersionFactory(): jest.Mocked<ITopicVersionFactory> {
    return {
      createNewVersion: jest.fn(),
      createContentVersion: jest.fn(),
      createNameVersion: jest.fn(),
      createParentVersion: jest.fn(),
    };
  }

  /**
   * Creates a mocked TopicService with all dependencies mocked
   */
  static createMockTopicService(): {
    service: jest.Mocked<TopicService>;
    mocks: {
      topicRepository: jest.Mocked<ITopicRepository>;
      versionFactory: jest.Mocked<ITopicVersionFactory>;
    };
  } {
    const topicRepository = this.createMockTopicRepository();
    const versionFactory = this.createMockTopicVersionFactory();

    // Create the service with mocked dependencies
    const service = new TopicService(
      topicRepository,
      versionFactory
    ) as jest.Mocked<TopicService>;

    // Mock all service methods
    service.createTopic = jest.fn();
    service.updateTopic = jest.fn();
    service.getTopic = jest.fn();
    service.getTopicVersions = jest.fn();
    service.deleteTopic = jest.fn();
    service.restoreTopic = jest.fn();
    service.searchTopics = jest.fn();
    service.getTopicHierarchy = jest.fn();
    service.getRootTopics = jest.fn();
    service.getOrphanedTopics = jest.fn();
    service.getChildTopics = jest.fn();
    service.validateParentChildRelationship = jest.fn();

    return {
      service,
      mocks: {
        topicRepository,
        versionFactory,
      },
    };
  }

  /**
   * Creates a mocked ResourceService with all dependencies mocked
   */
  static createMockResourceService(): {
    service: jest.Mocked<ResourceService>;
    mocks: {
      resourceRepository: jest.Mocked<IResourceRepository>;
      topicRepository: jest.Mocked<ITopicRepository>;
    };
  } {
    const resourceRepository = this.createMockResourceRepository();
    const topicRepository = this.createMockTopicRepository();

    const service = new ResourceService(
      resourceRepository,
      topicRepository
    ) as jest.Mocked<ResourceService>;

    // Mock all service methods
    service.createResource = jest.fn();
    service.updateResource = jest.fn();
    service.getResource = jest.fn();
    service.getResourcesByTopic = jest.fn();
    service.getResourcesByType = jest.fn();
    service.deleteResource = jest.fn();
    service.searchResources = jest.fn();
    service.getResourcesGroupedByTopic = jest.fn();
    service.getRecentResources = jest.fn();
    service.validateResourceAssociation = jest.fn();

    return {
      service,
      mocks: {
        resourceRepository,
        topicRepository,
      },
    };
  }

  /**
   * Creates a mocked UserService with all dependencies mocked
   */
  static createMockUserService(): {
    service: jest.Mocked<UserService>;
    mocks: {
      userRepository: jest.Mocked<IUserRepository>;
    };
  } {
    const userRepository = this.createMockUserRepository();

    const service = new UserService(userRepository) as jest.Mocked<UserService>;

    // Mock all service methods
    service.registerUser = jest.fn();
    service.authenticateUser = jest.fn();
    service.updateUser = jest.fn();
    service.getUser = jest.fn();
    service.getAllUsers = jest.fn();
    service.searchUsers = jest.fn();
    service.assignRole = jest.fn();
    service.deleteUser = jest.fn();
    service.getUserStats = jest.fn();
    service.validateUserPermissions = jest.fn();

    return {
      service,
      mocks: {
        userRepository,
      },
    };
  }

  /**
   * Creates a mocked TopicPathFinder with all dependencies mocked
   */
  static createMockTopicPathFinder(): {
    service: jest.Mocked<TopicPathFinder>;
    mocks: {
      topicRepository: jest.Mocked<ITopicRepository>;
    };
  } {
    const topicRepository = this.createMockTopicRepository();

    const service = new TopicPathFinder(
      topicRepository
    ) as jest.Mocked<TopicPathFinder>;

    // Mock all service methods
    service.findShortestPath = jest.fn();
    service.areTopicsConnected = jest.fn();
    service.getTopicDistance = jest.fn();
    service.findTopicsWithinDistance = jest.fn();
    service.validateGraphConnectivity = jest.fn();
    service.clearCache = jest.fn();
    service.getCacheStats = jest.fn();

    return {
      service,
      mocks: {
        topicRepository,
      },
    };
  }

  /**
   * Creates a complete set of mocked services for integration testing
   */
  static createMockServiceSet(): {
    topicService: jest.Mocked<TopicService>;
    resourceService: jest.Mocked<ResourceService>;
    userService: jest.Mocked<UserService>;
    pathFinder: jest.Mocked<TopicPathFinder>;
    repositories: {
      topicRepository: jest.Mocked<ITopicRepository>;
      resourceRepository: jest.Mocked<IResourceRepository>;
      userRepository: jest.Mocked<IUserRepository>;
    };
    factories: {
      versionFactory: jest.Mocked<ITopicVersionFactory>;
    };
  } {
    const topicMocks = this.createMockTopicService();
    const resourceMocks = this.createMockResourceService();
    const userMocks = this.createMockUserService();
    const pathMocks = this.createMockTopicPathFinder();

    return {
      topicService: topicMocks.service,
      resourceService: resourceMocks.service,
      userService: userMocks.service,
      pathFinder: pathMocks.service,
      repositories: {
        topicRepository: topicMocks.mocks.topicRepository,
        resourceRepository: resourceMocks.mocks.resourceRepository,
        userRepository: userMocks.mocks.userRepository,
      },
      factories: {
        versionFactory: topicMocks.mocks.versionFactory,
      },
    };
  }

  /**
   * Resets all mocks in a service set
   */
  static resetAllMocks(
    serviceSet: ReturnType<typeof ServiceMocks.createMockServiceSet>
  ): void {
    // Reset service mocks
    jest.clearAllMocks();

    // Reset repository mocks
    Object.values(serviceSet.repositories).forEach((repo) => {
      Object.values(repo).forEach((method) => {
        if (jest.isMockFunction(method)) {
          method.mockReset();
        }
      });
    });

    // Reset factory mocks
    Object.values(serviceSet.factories).forEach((factory) => {
      Object.values(factory).forEach((method) => {
        if (jest.isMockFunction(method)) {
          method.mockReset();
        }
      });
    });
  }

  /**
   * Sets up common mock behaviors for successful operations
   */
  static setupSuccessfulMocks(
    serviceSet: ReturnType<typeof ServiceMocks.createMockServiceSet>
  ): void {
    const { repositories } = serviceSet;

    // Setup common successful behaviors
    repositories.topicRepository.create.mockImplementation(
      async (topic) => topic
    );
    repositories.topicRepository.update.mockImplementation(
      async (id, topic) => topic as any
    );
    repositories.topicRepository.findById.mockResolvedValue(null);
    repositories.topicRepository.exists.mockResolvedValue(true);
    repositories.topicRepository.isDeleted.mockResolvedValue(false);

    repositories.resourceRepository.create.mockImplementation(
      async (resource) => resource
    );
    repositories.resourceRepository.update.mockImplementation(
      async (id, resource) => resource as any
    );
    repositories.resourceRepository.findById.mockResolvedValue(null);
    repositories.resourceRepository.existsByTopicAndUrl.mockResolvedValue(
      false
    );

    repositories.userRepository.create.mockImplementation(async (user) => user);
    repositories.userRepository.update.mockImplementation(
      async (id, user) => user as any
    );
    repositories.userRepository.findById.mockResolvedValue(null);
    repositories.userRepository.findByEmail.mockResolvedValue(null);
    repositories.userRepository.existsByEmail.mockResolvedValue(false);
  }

  /**
   * Sets up mock behaviors for error scenarios
   */
  static setupErrorMocks(
    serviceSet: ReturnType<typeof ServiceMocks.createMockServiceSet>
  ): void {
    const { repositories } = serviceSet;

    // Setup common error behaviors
    repositories.topicRepository.create.mockRejectedValue(
      new Error('Database error')
    );
    repositories.topicRepository.findById.mockRejectedValue(
      new Error('Database error')
    );

    repositories.resourceRepository.create.mockRejectedValue(
      new Error('Database error')
    );
    repositories.resourceRepository.findById.mockRejectedValue(
      new Error('Database error')
    );

    repositories.userRepository.create.mockRejectedValue(
      new Error('Database error')
    );
    repositories.userRepository.findById.mockRejectedValue(
      new Error('Database error')
    );
  }
}
