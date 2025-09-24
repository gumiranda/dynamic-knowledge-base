import { TopicPathFinder } from '../TopicPathFinder';
import { Topic } from '../../../domain/entities/Topic';
import { ITopicRepository } from '../../../domain/repositories/ITopicRepository';

// Mock implementation of ITopicRepository (reusing from main test file)
class MockTopicRepository implements ITopicRepository {
  private topics: Map<string, Topic> = new Map();

  addTopic(topic: Topic): void {
    this.topics.set(topic.id, topic);
  }

  clear(): void {
    this.topics.clear();
  }

  async findById(id: string): Promise<Topic | null> {
    return this.topics.get(id) || null;
  }

  async findAll(): Promise<Topic[]> {
    return Array.from(this.topics.values());
  }

  async create(entity: Topic): Promise<Topic> {
    this.topics.set(entity.id, entity);
    return entity;
  }

  async update(id: string, updates: Partial<Topic>): Promise<Topic> {
    const existing = this.topics.get(id);
    if (!existing) {
      throw new Error('Topic not found');
    }
    const updated = { ...existing, ...updates };
    this.topics.set(id, updated as Topic);
    return updated as Topic;
  }

  async delete(id: string): Promise<boolean> {
    return this.topics.delete(id);
  }

  async findByVersion(id: string, version: number): Promise<Topic | null> {
    const topic = this.topics.get(id);
    return topic && topic.version === version ? topic : null;
  }

  async findAllVersions(id: string): Promise<Topic[]> {
    const topic = this.topics.get(id);
    return topic ? [topic] : [];
  }

  async findByParentId(parentId: string): Promise<Topic[]> {
    return Array.from(this.topics.values()).filter(
      (topic) => topic.parentTopicId === parentId
    );
  }

  async findRootTopics(): Promise<Topic[]> {
    return Array.from(this.topics.values()).filter(
      (topic) => !topic.parentTopicId
    );
  }

  async findLatestVersion(id: string): Promise<Topic | null> {
    return this.topics.get(id) || null;
  }

  async getCurrentVersion(id: string): Promise<number | null> {
    const topic = this.topics.get(id);
    return topic ? topic.version : null;
  }

  async exists(id: string): Promise<boolean> {
    return this.topics.has(id);
  }

  async findByName(name: string): Promise<Topic[]> {
    return Array.from(this.topics.values()).filter((topic) =>
      topic.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  async findByContent(content: string): Promise<Topic[]> {
    return Array.from(this.topics.values()).filter((topic) =>
      topic.content.toLowerCase().includes(content.toLowerCase())
    );
  }

  async softDelete(id: string): Promise<boolean> {
    return this.topics.delete(id);
  }

  async restore(_id: string): Promise<boolean> {
    return false;
  }

  async isDeleted(id: string): Promise<boolean> {
    return !this.topics.has(id);
  }
}

describe('TopicPathFinder - Optimization Features', () => {
  let pathFinder: TopicPathFinder;
  let mockRepository: MockTopicRepository;

  beforeEach(() => {
    mockRepository = new MockTopicRepository();
  });

  afterEach(() => {
    mockRepository.clear();
  });

  describe('Caching', () => {
    beforeEach(() => {
      pathFinder = new TopicPathFinder(mockRepository, {
        cacheEnabled: true,
        cacheMaxSize: 5,
        cacheTTL: 1000, // 1 second for testing
      });
    });

    it('should cache path results and reuse them', async () => {
      // Arrange
      const parent = new Topic({
        id: 'parent',
        name: 'Parent Topic',
        content: 'Parent content',
      });

      const child = new Topic({
        id: 'child',
        name: 'Child Topic',
        content: 'Child content',
        parentTopicId: 'parent',
      });

      mockRepository.addTopic(parent);
      mockRepository.addTopic(child);

      // Spy on repository method to verify caching
      const findAllSpy = jest.spyOn(mockRepository, 'findAll');

      // Act - First call should build graph
      const path1 = await pathFinder.findShortestPath('parent', 'child');
      const firstCallCount = findAllSpy.mock.calls.length;

      // Act - Second call should use cache
      const path2 = await pathFinder.findShortestPath('parent', 'child');
      const secondCallCount = findAllSpy.mock.calls.length;

      // Assert
      expect(path1).toHaveLength(2);
      expect(path2).toHaveLength(2);
      expect(path1[0].id).toBe(path2[0].id);
      expect(path1[1].id).toBe(path2[1].id);

      // Should not call findAll again for cached result
      expect(secondCallCount).toBe(firstCallCount);
    });

    it('should handle bidirectional caching correctly', async () => {
      // Arrange
      const parent = new Topic({
        id: 'parent',
        name: 'Parent Topic',
        content: 'Parent content',
      });

      const child = new Topic({
        id: 'child',
        name: 'Child Topic',
        content: 'Child content',
        parentTopicId: 'parent',
      });

      mockRepository.addTopic(parent);
      mockRepository.addTopic(child);

      // Act - Cache path in one direction
      const path1 = await pathFinder.findShortestPath('parent', 'child');

      // Act - Request path in reverse direction (should use cache)
      const path2 = await pathFinder.findShortestPath('child', 'parent');

      // Assert
      expect(path1).toHaveLength(2);
      expect(path2).toHaveLength(2);
      expect(path1[0].id).toBe('parent');
      expect(path1[1].id).toBe('child');
      expect(path2[0].id).toBe('child');
      expect(path2[1].id).toBe('parent');
    });

    it('should evict old cache entries when cache is full', async () => {
      // Arrange - Create more topics than cache size
      const topics = [];
      for (let i = 0; i < 10; i++) {
        const topic = new Topic({
          id: `topic${i}`,
          name: `Topic ${i}`,
          content: `Content ${i}`,
        });
        topics.push(topic);
        mockRepository.addTopic(topic);
      }

      // Act - Fill cache beyond capacity
      for (let i = 0; i < 8; i++) {
        await pathFinder.findShortestPath(`topic${i}`, `topic${i}`);
      }

      const stats = pathFinder.getCacheStats();

      // Assert - Cache should not exceed max size
      expect(stats.pathCacheSize).toBeLessThanOrEqual(stats.pathCacheMaxSize);
    });

    it('should expire cache entries after TTL', async () => {
      // Arrange
      pathFinder = new TopicPathFinder(mockRepository, {
        cacheEnabled: true,
        cacheTTL: 50, // 50ms for testing
      });

      const topic1 = new Topic({
        id: 'topic1',
        name: 'Topic 1',
        content: 'Content 1',
      });

      const topic2 = new Topic({
        id: 'topic2',
        name: 'Topic 2',
        content: 'Content 2',
        parentTopicId: 'topic1',
      });

      mockRepository.addTopic(topic1);
      mockRepository.addTopic(topic2);

      // Act - Cache a result
      const path1 = await pathFinder.findShortestPath('topic1', 'topic2');
      expect(path1).toHaveLength(2);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clear graph cache to force repository call
      pathFinder.clearCache();

      // Spy on repository after clearing cache
      const findAllSpy = jest.spyOn(mockRepository, 'findAll');

      // Act - Request again after expiry
      const path2 = await pathFinder.findShortestPath('topic1', 'topic2');

      // Assert - Should call repository again (cache miss)
      expect(findAllSpy).toHaveBeenCalled();
      expect(path2).toHaveLength(2);
    });

    it('should allow disabling cache', async () => {
      // Arrange
      pathFinder = new TopicPathFinder(mockRepository, {
        cacheEnabled: false,
      });

      const topic1 = new Topic({
        id: 'topic1',
        name: 'Topic 1',
        content: 'Content 1',
      });

      const topic2 = new Topic({
        id: 'topic2',
        name: 'Topic 2',
        content: 'Content 2',
        parentTopicId: 'topic1',
      });

      mockRepository.addTopic(topic1);
      mockRepository.addTopic(topic2);

      // Act - Make multiple calls
      const path1 = await pathFinder.findShortestPath('topic1', 'topic2');
      const path2 = await pathFinder.findShortestPath('topic2', 'topic1');

      // Assert - Both calls should succeed
      expect(path1).toHaveLength(2);
      expect(path2).toHaveLength(2);
      expect(path1[0].id).toBe('topic1');
      expect(path1[1].id).toBe('topic2');
      expect(path2[0].id).toBe('topic2');
      expect(path2[1].id).toBe('topic1');
    });
  });

  describe('Performance Optimizations', () => {
    beforeEach(() => {
      pathFinder = new TopicPathFinder(mockRepository, {
        maxSearchDepth: 5,
        enableBidirectionalSearch: true,
      });
    });

    it('should respect max search depth', async () => {
      // Arrange - Create a deep chain
      const topics = [];
      for (let i = 0; i < 10; i++) {
        const topic = new Topic({
          id: `topic${i}`,
          name: `Topic ${i}`,
          content: `Content ${i}`,
          parentTopicId: i > 0 ? `topic${i - 1}` : undefined,
        });
        topics.push(topic);
        mockRepository.addTopic(topic);
      }

      // Act - Try to find path that exceeds max depth
      const path = await pathFinder.findShortestPath('topic0', 'topic9');

      // Assert - Should return empty path due to depth limit
      expect(path).toHaveLength(0);
    });

    it('should find path within depth limit', async () => {
      // Arrange - Create a chain within depth limit
      const topics = [];
      for (let i = 0; i < 4; i++) {
        const topic = new Topic({
          id: `topic${i}`,
          name: `Topic ${i}`,
          content: `Content ${i}`,
          parentTopicId: i > 0 ? `topic${i - 1}` : undefined,
        });
        topics.push(topic);
        mockRepository.addTopic(topic);
      }

      // Act
      const path = await pathFinder.findShortestPath('topic0', 'topic3');

      // Assert - Should find path within depth limit
      expect(path).toHaveLength(4);
    });

    it('should use bidirectional search when enabled', async () => {
      // Arrange - Create a simple graph to test bidirectional search
      const parent = new Topic({
        id: 'parent',
        name: 'Parent',
        content: 'Parent',
      });

      const child = new Topic({
        id: 'child',
        name: 'Child',
        content: 'Child',
        parentTopicId: 'parent',
      });

      mockRepository.addTopic(parent);
      mockRepository.addTopic(child);

      // Act
      const path = await pathFinder.findShortestPath('parent', 'child');

      // Assert - Should find direct path
      expect(path).toHaveLength(2);
      expect(path[0].id).toBe('parent');
      expect(path[1].id).toBe('child');
    });

    it('should fall back to regular BFS when bidirectional is disabled', async () => {
      // Arrange
      pathFinder = new TopicPathFinder(mockRepository, {
        enableBidirectionalSearch: false,
      });

      const parent = new Topic({
        id: 'parent',
        name: 'Parent',
        content: 'Parent',
      });

      const child = new Topic({
        id: 'child',
        name: 'Child',
        content: 'Child',
        parentTopicId: 'parent',
      });

      mockRepository.addTopic(parent);
      mockRepository.addTopic(child);

      // Act
      const path = await pathFinder.findShortestPath('parent', 'child');

      // Assert
      expect(path).toHaveLength(2);
      expect(path[0].id).toBe('parent');
      expect(path[1].id).toBe('child');
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      pathFinder = new TopicPathFinder(mockRepository, {
        cacheEnabled: true,
      });
    });

    it('should clear cache when requested', async () => {
      // Arrange
      const topic = new Topic({
        id: 'topic',
        name: 'Topic',
        content: 'Content',
      });

      mockRepository.addTopic(topic);

      // Act - Cache a result (use different topics to ensure path finding)
      const topic2 = new Topic({
        id: 'topic2',
        name: 'Topic 2',
        content: 'Content 2',
        parentTopicId: 'topic',
      });
      mockRepository.addTopic(topic2);

      await pathFinder.findShortestPath('topic', 'topic2');

      let stats = pathFinder.getCacheStats();
      expect(stats.pathCacheSize).toBeGreaterThan(0);

      // Clear cache
      pathFinder.clearCache();

      stats = pathFinder.getCacheStats();

      // Assert
      expect(stats.pathCacheSize).toBe(0);
      expect(stats.graphCacheValid).toBe(false);
    });

    it('should provide accurate cache statistics', async () => {
      // Arrange
      const topics = [];
      for (let i = 0; i < 3; i++) {
        const topic = new Topic({
          id: `topic${i}`,
          name: `Topic ${i}`,
          content: `Content ${i}`,
        });
        topics.push(topic);
        mockRepository.addTopic(topic);
      }

      // Create parent-child relationships to ensure path finding
      topics[1].parentTopicId = 'topic0';
      topics[2].parentTopicId = 'topic1';

      // Act - Cache some results
      await pathFinder.findShortestPath('topic0', 'topic1');
      await pathFinder.findShortestPath('topic1', 'topic2');

      const stats = pathFinder.getCacheStats();

      // Assert
      expect(stats.pathCacheSize).toBe(2);
      expect(stats.pathCacheMaxSize).toBeGreaterThan(0);
      expect(typeof stats.graphCacheValid).toBe('boolean');
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      pathFinder = new TopicPathFinder(mockRepository);
    });

    it('should validate topic ID types', async () => {
      // Act & Assert
      await expect(
        pathFinder.findShortestPath(123 as any, 'topic')
      ).rejects.toThrow('Topic IDs must be strings');

      await expect(
        pathFinder.findShortestPath('topic', null as any)
      ).rejects.toThrow('Topic IDs must be strings');
    });

    it('should validate empty topic IDs', async () => {
      // Act & Assert
      await expect(pathFinder.findShortestPath('   ', 'topic')).rejects.toThrow(
        'Topic IDs cannot be empty strings'
      );

      await expect(pathFinder.findShortestPath('topic', '   ')).rejects.toThrow(
        'Topic IDs cannot be empty strings'
      );
    });
  });
});
