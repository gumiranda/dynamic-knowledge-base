import { TopicPathFinder } from '../TopicPathFinder';
import { Topic } from '../../../domain/entities/Topic';
import { ITopicRepository } from '../../../domain/repositories/ITopicRepository';

// Mock implementation
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

describe('TopicPathFinder - Enhanced Unit Tests', () => {
  let pathFinder: TopicPathFinder;
  let topicA: Topic;
  let topicB: Topic;
  let topicC: Topic;
  let topicD: Topic;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize path finder
    pathFinder = new TopicPathFinder(mockTopicRepository);

    // Create test topics with hierarchy: A -> B -> C, D (isolated)
    topicA = new Topic({
      name: 'Topic A',
      content: 'Content A',
    });

    topicB = new Topic({
      name: 'Topic B',
      content: 'Content B',
      parentTopicId: topicA.id,
    });

    topicC = new Topic({
      name: 'Topic C',
      content: 'Content C',
      parentTopicId: topicB.id,
    });

    topicD = new Topic({
      name: 'Topic D',
      content: 'Content D',
    });
  });

  describe('findShortestPath', () => {
    it('should find path between connected topics', async () => {
      // Arrange
      const allTopics = [topicA, topicB, topicC, topicD];
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(topicA) // start topic
        .mockResolvedValueOnce(topicC) // end topic
        .mockResolvedValueOnce(topicA) // for path conversion
        .mockResolvedValueOnce(topicB) // for path conversion
        .mockResolvedValueOnce(topicC); // for path conversion
      mockTopicRepository.findAll.mockResolvedValue(allTopics);

      // Act
      const path = await pathFinder.findShortestPath(topicA.id, topicC.id);

      // Assert
      expect(path).toHaveLength(3);
      expect(path[0].id).toBe(topicA.id);
      expect(path[1].id).toBe(topicB.id);
      expect(path[2].id).toBe(topicC.id);
    });

    it('should return single topic when start equals end', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(topicA);

      // Act
      const path = await pathFinder.findShortestPath(topicA.id, topicA.id);

      // Assert
      expect(path).toHaveLength(1);
      expect(path[0].id).toBe(topicA.id);
    });

    it('should return empty array when no path exists', async () => {
      // Arrange
      const allTopics = [topicA, topicB, topicC, topicD];
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(topicA) // start topic
        .mockResolvedValueOnce(topicD); // end topic (isolated)
      mockTopicRepository.findAll.mockResolvedValue(allTopics);

      // Act
      const path = await pathFinder.findShortestPath(topicA.id, topicD.id);

      // Assert
      expect(path).toHaveLength(0);
    });

    it('should throw error when start topic not found', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(null) // start topic not found
        .mockResolvedValueOnce(topicB); // end topic

      // Act & Assert
      await expect(
        pathFinder.findShortestPath('non-existent-id', topicB.id)
      ).rejects.toThrow('Start topic with ID non-existent-id not found');
    });

    it('should throw error when end topic not found', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(topicA) // start topic
        .mockResolvedValueOnce(null); // end topic not found

      // Act & Assert
      await expect(
        pathFinder.findShortestPath(topicA.id, 'non-existent-id')
      ).rejects.toThrow('End topic with ID non-existent-id not found');
    });

    it('should validate input parameters', async () => {
      // Act & Assert
      await expect(pathFinder.findShortestPath('', topicB.id)).rejects.toThrow(
        'Topic IDs cannot be empty strings'
      );

      await expect(pathFinder.findShortestPath(topicA.id, '')).rejects.toThrow(
        'Topic IDs cannot be empty strings'
      );

      await expect(
        pathFinder.findShortestPath(null as any, topicB.id)
      ).rejects.toThrow('Topic IDs must be strings');
    });

    it('should respect max search depth', async () => {
      // Arrange
      const pathFinderWithLowDepth = new TopicPathFinder(mockTopicRepository, {
        maxSearchDepth: 1,
      });

      const allTopics = [topicA, topicB, topicC];
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(topicA) // start topic
        .mockResolvedValueOnce(topicC); // end topic
      mockTopicRepository.findAll.mockResolvedValue(allTopics);

      // Act
      const path = await pathFinderWithLowDepth.findShortestPath(
        topicA.id,
        topicC.id
      );

      // Assert
      expect(path).toHaveLength(0); // Should not find path due to depth limit
    });

    it('should use cached results when available', async () => {
      // Arrange
      const pathFinderWithCache = new TopicPathFinder(mockTopicRepository, {
        cacheEnabled: true,
      });

      const allTopics = [topicA, topicB];
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(topicA) // start topic (first call)
        .mockResolvedValueOnce(topicB) // end topic (first call)
        .mockResolvedValueOnce(topicA) // for path conversion (first call)
        .mockResolvedValueOnce(topicB); // for path conversion (first call)
      mockTopicRepository.findAll.mockResolvedValue(allTopics);

      // Act - First call should build cache
      const path1 = await pathFinderWithCache.findShortestPath(
        topicA.id,
        topicB.id
      );

      // Reset mocks to verify cache usage
      jest.clearAllMocks();
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(topicA) // for path conversion (cached call)
        .mockResolvedValueOnce(topicB); // for path conversion (cached call)

      // Act - Second call should use cache
      const path2 = await pathFinderWithCache.findShortestPath(
        topicA.id,
        topicB.id
      );

      // Assert
      expect(path1).toEqual(path2);
      expect(mockTopicRepository.findAll).not.toHaveBeenCalled(); // Should not rebuild graph
    });

    it('should handle bidirectional search when enabled', async () => {
      // Arrange
      const pathFinderBidirectional = new TopicPathFinder(mockTopicRepository, {
        enableBidirectionalSearch: true,
      });

      const allTopics = [topicA, topicB, topicC];
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(topicA) // start topic
        .mockResolvedValueOnce(topicC) // end topic
        .mockResolvedValueOnce(topicA) // for path conversion
        .mockResolvedValueOnce(topicB) // for path conversion
        .mockResolvedValueOnce(topicC); // for path conversion
      mockTopicRepository.findAll.mockResolvedValue(allTopics);

      // Act
      const path = await pathFinderBidirectional.findShortestPath(
        topicA.id,
        topicC.id
      );

      // Assert
      expect(path).toHaveLength(3);
      expect(path[0].id).toBe(topicA.id);
      expect(path[2].id).toBe(topicC.id);
    });
  });

  describe('areTopicsConnected', () => {
    it('should return true for connected topics', async () => {
      // Arrange
      const allTopics = [topicA, topicB];
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(topicA) // start topic
        .mockResolvedValueOnce(topicB) // end topic
        .mockResolvedValueOnce(topicA) // for path conversion
        .mockResolvedValueOnce(topicB); // for path conversion
      mockTopicRepository.findAll.mockResolvedValue(allTopics);

      // Act
      const connected = await pathFinder.areTopicsConnected(
        topicA.id,
        topicB.id
      );

      // Assert
      expect(connected).toBe(true);
    });

    it('should return false for disconnected topics', async () => {
      // Arrange
      const allTopics = [topicA, topicD];
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(topicA) // start topic
        .mockResolvedValueOnce(topicD); // end topic (isolated)
      mockTopicRepository.findAll.mockResolvedValue(allTopics);

      // Act
      const connected = await pathFinder.areTopicsConnected(
        topicA.id,
        topicD.id
      );

      // Assert
      expect(connected).toBe(false);
    });

    it('should return false when error occurs', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockRejectedValue(
        new Error('Database error')
      );

      // Act
      const connected = await pathFinder.areTopicsConnected(
        topicA.id,
        topicB.id
      );

      // Assert
      expect(connected).toBe(false);
    });
  });

  describe('getTopicDistance', () => {
    it('should return correct distance for connected topics', async () => {
      // Arrange
      const allTopics = [topicA, topicB, topicC];
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(topicA) // start topic
        .mockResolvedValueOnce(topicC) // end topic
        .mockResolvedValueOnce(topicA) // for path conversion
        .mockResolvedValueOnce(topicB) // for path conversion
        .mockResolvedValueOnce(topicC); // for path conversion
      mockTopicRepository.findAll.mockResolvedValue(allTopics);

      // Act
      const distance = await pathFinder.getTopicDistance(topicA.id, topicC.id);

      // Assert
      expect(distance).toBe(2); // A -> B -> C = 2 hops
    });

    it('should return 0 for same topic', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(topicA);

      // Act
      const distance = await pathFinder.getTopicDistance(topicA.id, topicA.id);

      // Assert
      expect(distance).toBe(0);
    });

    it('should return -1 for disconnected topics', async () => {
      // Arrange
      const allTopics = [topicA, topicD];
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(topicA) // start topic
        .mockResolvedValueOnce(topicD); // end topic (isolated)
      mockTopicRepository.findAll.mockResolvedValue(allTopics);

      // Act
      const distance = await pathFinder.getTopicDistance(topicA.id, topicD.id);

      // Assert
      expect(distance).toBe(-1);
    });
  });

  describe('findTopicsWithinDistance', () => {
    it('should find topics within specified distance', async () => {
      // Arrange
      const allTopics = [topicA, topicB, topicC];
      mockTopicRepository.findLatestVersion
        .mockResolvedValueOnce(topicA) // center topic
        .mockResolvedValueOnce(topicA) // for result conversion
        .mockResolvedValueOnce(topicB); // for result conversion
      mockTopicRepository.findAll.mockResolvedValue(allTopics);

      // Act
      const nearbyTopics = await pathFinder.findTopicsWithinDistance(
        topicA.id,
        1
      );

      // Assert
      expect(nearbyTopics).toHaveLength(2); // A and B
      expect(nearbyTopics.map((t) => t.id)).toContain(topicA.id);
      expect(nearbyTopics.map((t) => t.id)).toContain(topicB.id);
    });

    it('should return only center topic for distance 0', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(topicA);

      // Act
      const nearbyTopics = await pathFinder.findTopicsWithinDistance(
        topicA.id,
        0
      );

      // Assert
      expect(nearbyTopics).toHaveLength(1);
      expect(nearbyTopics[0].id).toBe(topicA.id);
    });

    it('should throw error for negative distance', async () => {
      // Act & Assert
      await expect(
        pathFinder.findTopicsWithinDistance(topicA.id, -1)
      ).rejects.toThrow('Maximum distance must be non-negative');
    });

    it('should throw error when center topic not found', async () => {
      // Arrange
      mockTopicRepository.findLatestVersion.mockResolvedValue(null);

      // Act & Assert
      await expect(
        pathFinder.findTopicsWithinDistance('non-existent-id', 1)
      ).rejects.toThrow('Topic with ID non-existent-id not found');
    });
  });

  describe('validateGraphConnectivity', () => {
    it('should detect fully connected graph', async () => {
      // Arrange
      const allTopics = [topicA, topicB, topicC];
      mockTopicRepository.findAll.mockResolvedValue(allTopics);

      // Act
      const result = await pathFinder.validateGraphConnectivity();

      // Assert
      expect(result.isFullyConnected).toBe(true);
      expect(result.componentCount).toBe(1);
      expect(result.isolatedTopics).toHaveLength(0);
    });

    it('should detect disconnected components', async () => {
      // Arrange
      const allTopics = [topicA, topicB, topicD]; // A-B connected, D isolated
      mockTopicRepository.findAll.mockResolvedValue(allTopics);

      // Act
      const result = await pathFinder.validateGraphConnectivity();

      // Assert
      expect(result.isFullyConnected).toBe(false);
      expect(result.componentCount).toBe(2);
      expect(result.isolatedTopics).toContain(topicD.id);
    });

    it('should handle empty graph', async () => {
      // Arrange
      mockTopicRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await pathFinder.validateGraphConnectivity();

      // Assert
      expect(result.isFullyConnected).toBe(true);
      expect(result.componentCount).toBe(0);
      expect(result.isolatedTopics).toHaveLength(0);
    });
  });

  describe('cache management', () => {
    it('should clear cache when requested', () => {
      // Act
      pathFinder.clearCache();

      // Assert
      const stats = pathFinder.getCacheStats();
      expect(stats.pathCacheSize).toBe(0);
      expect(stats.graphCacheValid).toBe(false);
    });

    it('should provide cache statistics', () => {
      // Act
      const stats = pathFinder.getCacheStats();

      // Assert
      expect(stats).toHaveProperty('pathCacheSize');
      expect(stats).toHaveProperty('pathCacheMaxSize');
      expect(stats).toHaveProperty('graphCacheValid');
    });

    it('should evict old cache entries when cache is full', async () => {
      // Arrange
      const pathFinderSmallCache = new TopicPathFinder(mockTopicRepository, {
        cacheEnabled: true,
        cacheMaxSize: 1,
      });

      const allTopics = [topicA, topicB, topicC];
      mockTopicRepository.findLatestVersion
        .mockResolvedValue(topicA)
        .mockResolvedValue(topicB)
        .mockResolvedValue(topicC);
      mockTopicRepository.findAll.mockResolvedValue(allTopics);

      // Act - Fill cache beyond capacity
      await pathFinderSmallCache.findShortestPath(topicA.id, topicB.id);
      await pathFinderSmallCache.findShortestPath(topicB.id, topicC.id);

      // Assert
      const stats = pathFinderSmallCache.getCacheStats();
      expect(stats.pathCacheSize).toBeLessThanOrEqual(1);
    });
  });
});
