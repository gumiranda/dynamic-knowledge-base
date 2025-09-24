import { TopicPathFinder } from '../TopicPathFinder';
import { Topic } from '../../../domain/entities/Topic';
import { ITopicRepository } from '../../../domain/repositories/ITopicRepository';

// Mock implementation of ITopicRepository
class MockTopicRepository implements ITopicRepository {
  private topics: Map<string, Topic> = new Map();

  // Add topics for testing
  addTopic(topic: Topic): void {
    this.topics.set(topic.id, topic);
  }

  // Clear all topics
  clear(): void {
    this.topics.clear();
  }

  // ITopicRepository implementation
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
    return false; // Not implemented for mock
  }

  async isDeleted(id: string): Promise<boolean> {
    return !this.topics.has(id);
  }
}

describe('TopicPathFinder', () => {
  let pathFinder: TopicPathFinder;
  let mockRepository: MockTopicRepository;

  beforeEach(() => {
    mockRepository = new MockTopicRepository();
    pathFinder = new TopicPathFinder(mockRepository);
  });

  afterEach(() => {
    mockRepository.clear();
  });

  describe('findShortestPath', () => {
    it('should find direct path between parent and child', async () => {
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

      // Act
      const path = await pathFinder.findShortestPath('parent', 'child');

      // Assert
      expect(path).toHaveLength(2);
      expect(path[0].id).toBe('parent');
      expect(path[1].id).toBe('child');
    });

    it('should find path through multiple levels', async () => {
      // Arrange
      const root = new Topic({
        id: 'root',
        name: 'Root Topic',
        content: 'Root content',
      });

      const middle = new Topic({
        id: 'middle',
        name: 'Middle Topic',
        content: 'Middle content',
        parentTopicId: 'root',
      });

      const leaf = new Topic({
        id: 'leaf',
        name: 'Leaf Topic',
        content: 'Leaf content',
        parentTopicId: 'middle',
      });

      mockRepository.addTopic(root);
      mockRepository.addTopic(middle);
      mockRepository.addTopic(leaf);

      // Act
      const path = await pathFinder.findShortestPath('root', 'leaf');

      // Assert
      expect(path).toHaveLength(3);
      expect(path[0].id).toBe('root');
      expect(path[1].id).toBe('middle');
      expect(path[2].id).toBe('leaf');
    });

    it('should find path in reverse direction (child to parent)', async () => {
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

      // Act
      const path = await pathFinder.findShortestPath('child', 'parent');

      // Assert
      expect(path).toHaveLength(2);
      expect(path[0].id).toBe('child');
      expect(path[1].id).toBe('parent');
    });

    it('should return single topic when start and end are the same', async () => {
      // Arrange
      const topic = new Topic({
        id: 'same',
        name: 'Same Topic',
        content: 'Same content',
      });

      mockRepository.addTopic(topic);

      // Act
      const path = await pathFinder.findShortestPath('same', 'same');

      // Assert
      expect(path).toHaveLength(1);
      expect(path[0].id).toBe('same');
    });

    it('should return empty array when no path exists (disconnected topics)', async () => {
      // Arrange
      const topic1 = new Topic({
        id: 'isolated1',
        name: 'Isolated Topic 1',
        content: 'Isolated content 1',
      });

      const topic2 = new Topic({
        id: 'isolated2',
        name: 'Isolated Topic 2',
        content: 'Isolated content 2',
      });

      mockRepository.addTopic(topic1);
      mockRepository.addTopic(topic2);

      // Act
      const path = await pathFinder.findShortestPath('isolated1', 'isolated2');

      // Assert
      expect(path).toHaveLength(0);
    });

    it('should find shortest path in complex hierarchy', async () => {
      // Arrange - Create a more complex tree structure
      //     root
      //    /    \
      //   A      B
      //  / \    / \
      // C   D  E   F
      //         \
      //          G

      const topics = [
        new Topic({ id: 'root', name: 'Root', content: 'Root' }),
        new Topic({ id: 'A', name: 'A', content: 'A', parentTopicId: 'root' }),
        new Topic({ id: 'B', name: 'B', content: 'B', parentTopicId: 'root' }),
        new Topic({ id: 'C', name: 'C', content: 'C', parentTopicId: 'A' }),
        new Topic({ id: 'D', name: 'D', content: 'D', parentTopicId: 'A' }),
        new Topic({ id: 'E', name: 'E', content: 'E', parentTopicId: 'B' }),
        new Topic({ id: 'F', name: 'F', content: 'F', parentTopicId: 'B' }),
        new Topic({ id: 'G', name: 'G', content: 'G', parentTopicId: 'E' }),
      ];

      topics.forEach((topic) => mockRepository.addTopic(topic));

      // Act - Find path from C to G (should go through root)
      const path = await pathFinder.findShortestPath('C', 'G');

      // Assert - Path should be C -> A -> root -> B -> E -> G
      expect(path).toHaveLength(6);
      expect(path.map((t) => t.id)).toEqual(['C', 'A', 'root', 'B', 'E', 'G']);
    });

    it('should throw error when start topic does not exist', async () => {
      // Arrange
      const topic = new Topic({
        id: 'existing',
        name: 'Existing Topic',
        content: 'Existing content',
      });

      mockRepository.addTopic(topic);

      // Act & Assert
      await expect(
        pathFinder.findShortestPath('nonexistent', 'existing')
      ).rejects.toThrow('Start topic with ID nonexistent not found');
    });

    it('should throw error when end topic does not exist', async () => {
      // Arrange
      const topic = new Topic({
        id: 'existing',
        name: 'Existing Topic',
        content: 'Existing content',
      });

      mockRepository.addTopic(topic);

      // Act & Assert
      await expect(
        pathFinder.findShortestPath('existing', 'nonexistent')
      ).rejects.toThrow('End topic with ID nonexistent not found');
    });

    it('should throw error when topic IDs are empty', async () => {
      // Act & Assert
      await expect(pathFinder.findShortestPath('', 'topic')).rejects.toThrow(
        'Both start and end topic IDs are required'
      );

      await expect(pathFinder.findShortestPath('topic', '')).rejects.toThrow(
        'Both start and end topic IDs are required'
      );
    });
  });

  describe('areTopicsConnected', () => {
    it('should return true for connected topics', async () => {
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

      // Act
      const connected = await pathFinder.areTopicsConnected('parent', 'child');

      // Assert
      expect(connected).toBe(true);
    });

    it('should return false for disconnected topics', async () => {
      // Arrange
      const topic1 = new Topic({
        id: 'isolated1',
        name: 'Isolated Topic 1',
        content: 'Isolated content 1',
      });

      const topic2 = new Topic({
        id: 'isolated2',
        name: 'Isolated Topic 2',
        content: 'Isolated content 2',
      });

      mockRepository.addTopic(topic1);
      mockRepository.addTopic(topic2);

      // Act
      const connected = await pathFinder.areTopicsConnected(
        'isolated1',
        'isolated2'
      );

      // Assert
      expect(connected).toBe(false);
    });

    it('should return false when topics do not exist', async () => {
      // Act
      const connected = await pathFinder.areTopicsConnected(
        'nonexistent1',
        'nonexistent2'
      );

      // Assert
      expect(connected).toBe(false);
    });
  });

  describe('getTopicDistance', () => {
    it('should return correct distance for connected topics', async () => {
      // Arrange
      const root = new Topic({
        id: 'root',
        name: 'Root Topic',
        content: 'Root content',
      });

      const middle = new Topic({
        id: 'middle',
        name: 'Middle Topic',
        content: 'Middle content',
        parentTopicId: 'root',
      });

      const leaf = new Topic({
        id: 'leaf',
        name: 'Leaf Topic',
        content: 'Leaf content',
        parentTopicId: 'middle',
      });

      mockRepository.addTopic(root);
      mockRepository.addTopic(middle);
      mockRepository.addTopic(leaf);

      // Act
      const distance = await pathFinder.getTopicDistance('root', 'leaf');

      // Assert
      expect(distance).toBe(2); // 3 topics in path, so 2 hops
    });

    it('should return 0 for same topic', async () => {
      // Arrange
      const topic = new Topic({
        id: 'same',
        name: 'Same Topic',
        content: 'Same content',
      });

      mockRepository.addTopic(topic);

      // Act
      const distance = await pathFinder.getTopicDistance('same', 'same');

      // Assert
      expect(distance).toBe(0);
    });

    it('should return -1 for disconnected topics', async () => {
      // Arrange
      const topic1 = new Topic({
        id: 'isolated1',
        name: 'Isolated Topic 1',
        content: 'Isolated content 1',
      });

      const topic2 = new Topic({
        id: 'isolated2',
        name: 'Isolated Topic 2',
        content: 'Isolated content 2',
      });

      mockRepository.addTopic(topic1);
      mockRepository.addTopic(topic2);

      // Act
      const distance = await pathFinder.getTopicDistance(
        'isolated1',
        'isolated2'
      );

      // Assert
      expect(distance).toBe(-1);
    });
  });

  describe('findTopicsWithinDistance', () => {
    it('should find topics within specified distance', async () => {
      // Arrange
      const root = new Topic({
        id: 'root',
        name: 'Root Topic',
        content: 'Root content',
      });

      const child1 = new Topic({
        id: 'child1',
        name: 'Child 1',
        content: 'Child 1 content',
        parentTopicId: 'root',
      });

      const child2 = new Topic({
        id: 'child2',
        name: 'Child 2',
        content: 'Child 2 content',
        parentTopicId: 'root',
      });

      const grandchild = new Topic({
        id: 'grandchild',
        name: 'Grandchild',
        content: 'Grandchild content',
        parentTopicId: 'child1',
      });

      mockRepository.addTopic(root);
      mockRepository.addTopic(child1);
      mockRepository.addTopic(child2);
      mockRepository.addTopic(grandchild);

      // Act
      const topicsWithinDistance1 = await pathFinder.findTopicsWithinDistance(
        'root',
        1
      );

      // Assert
      expect(topicsWithinDistance1).toHaveLength(3); // root, child1, child2
      const ids = topicsWithinDistance1.map((t) => t.id).sort();
      expect(ids).toEqual(['child1', 'child2', 'root']);
    });

    it('should return only the topic itself when distance is 0', async () => {
      // Arrange
      const topic = new Topic({
        id: 'single',
        name: 'Single Topic',
        content: 'Single content',
      });

      mockRepository.addTopic(topic);

      // Act
      const topics = await pathFinder.findTopicsWithinDistance('single', 0);

      // Assert
      expect(topics).toHaveLength(1);
      expect(topics[0].id).toBe('single');
    });

    it('should throw error for negative distance', async () => {
      // Arrange
      const topic = new Topic({
        id: 'topic',
        name: 'Topic',
        content: 'Content',
      });

      mockRepository.addTopic(topic);

      // Act & Assert
      await expect(
        pathFinder.findTopicsWithinDistance('topic', -1)
      ).rejects.toThrow('Maximum distance must be non-negative');
    });

    it('should throw error when topic does not exist', async () => {
      // Act & Assert
      await expect(
        pathFinder.findTopicsWithinDistance('nonexistent', 1)
      ).rejects.toThrow('Topic with ID nonexistent not found');
    });
  });

  describe('validateGraphConnectivity', () => {
    it('should report fully connected graph', async () => {
      // Arrange
      const root = new Topic({
        id: 'root',
        name: 'Root Topic',
        content: 'Root content',
      });

      const child = new Topic({
        id: 'child',
        name: 'Child Topic',
        content: 'Child content',
        parentTopicId: 'root',
      });

      mockRepository.addTopic(root);
      mockRepository.addTopic(child);

      // Act
      const result = await pathFinder.validateGraphConnectivity();

      // Assert
      expect(result.isFullyConnected).toBe(true);
      expect(result.componentCount).toBe(1);
      expect(result.isolatedTopics).toHaveLength(0);
    });

    it('should report disconnected components', async () => {
      // Arrange
      const topic1 = new Topic({
        id: 'isolated1',
        name: 'Isolated Topic 1',
        content: 'Isolated content 1',
      });

      const topic2 = new Topic({
        id: 'isolated2',
        name: 'Isolated Topic 2',
        content: 'Isolated content 2',
      });

      mockRepository.addTopic(topic1);
      mockRepository.addTopic(topic2);

      // Act
      const result = await pathFinder.validateGraphConnectivity();

      // Assert
      expect(result.isFullyConnected).toBe(false);
      expect(result.componentCount).toBe(2);
      expect(result.isolatedTopics).toHaveLength(2);
      expect(result.isolatedTopics.sort()).toEqual(['isolated1', 'isolated2']);
    });

    it('should handle empty graph', async () => {
      // Act
      const result = await pathFinder.validateGraphConnectivity();

      // Assert
      expect(result.isFullyConnected).toBe(true);
      expect(result.componentCount).toBe(0);
      expect(result.isolatedTopics).toHaveLength(0);
    });
  });
});
