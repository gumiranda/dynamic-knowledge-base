import { TopicPathFinder } from '../TopicPathFinder';
import { Topic } from '../../../domain/entities/Topic';
import { ITopicRepository } from '../../../domain/repositories/ITopicRepository';

// Simple mock implementation of ITopicRepository
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
      (t) => t.parentTopicId === parentId
    );
  }

  async findRootTopics(): Promise<Topic[]> {
    return Array.from(this.topics.values()).filter((t) => !t.parentTopicId);
  }

  async findLatestVersion(id: string): Promise<Topic | null> {
    return this.topics.get(id) || null;
  }

  async getCurrentVersion(id: string): Promise<number> {
    const topic = this.topics.get(id);
    return topic ? topic.version : 0;
  }

  async exists(id: string): Promise<boolean> {
    return this.topics.has(id);
  }

  async findByName(name: string): Promise<Topic[]> {
    return Array.from(this.topics.values()).filter((t) => t.name === name);
  }

  async findByContent(content: string): Promise<Topic[]> {
    return Array.from(this.topics.values()).filter((t) =>
      t.content.includes(content)
    );
  }

  async softDelete(id: string): Promise<boolean> {
    return this.delete(id);
  }

  async restore(): Promise<boolean> {
    return true;
  }

  async isDeleted(): Promise<boolean> {
    return false;
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

      const path = await pathFinder.findShortestPath('parent', 'child');

      expect(path).toHaveLength(2);
      expect(path[0].id).toBe('parent');
      expect(path[1].id).toBe('child');
    });

    it('should return single topic when start and end are the same', async () => {
      const topic = new Topic({
        id: 'topic',
        name: 'Topic',
        content: 'Content',
      });

      mockRepository.addTopic(topic);

      const path = await pathFinder.findShortestPath('topic', 'topic');

      expect(path).toHaveLength(1);
      expect(path[0].id).toBe('topic');
    });

    it('should return empty array when no path exists', async () => {
      const topic1 = new Topic({
        id: 'topic1',
        name: 'Topic 1',
        content: 'Content 1',
      });

      const topic2 = new Topic({
        id: 'topic2',
        name: 'Topic 2',
        content: 'Content 2',
      });

      mockRepository.addTopic(topic1);
      mockRepository.addTopic(topic2);

      const path = await pathFinder.findShortestPath('topic1', 'topic2');

      expect(path).toHaveLength(0);
    });

    it('should throw error when start topic does not exist', async () => {
      const topic = new Topic({
        id: 'existing',
        name: 'Existing Topic',
        content: 'Content',
      });

      mockRepository.addTopic(topic);

      await expect(
        pathFinder.findShortestPath('nonexistent', 'existing')
      ).rejects.toThrow();
    });
  });

  describe('areTopicsConnected', () => {
    it('should return true for connected topics', async () => {
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

      const connected = await pathFinder.areTopicsConnected('parent', 'child');

      expect(connected).toBe(true);
    });

    it('should return false for disconnected topics', async () => {
      const topic1 = new Topic({
        id: 'topic1',
        name: 'Topic 1',
        content: 'Content 1',
      });

      const topic2 = new Topic({
        id: 'topic2',
        name: 'Topic 2',
        content: 'Content 2',
      });

      mockRepository.addTopic(topic1);
      mockRepository.addTopic(topic2);

      const connected = await pathFinder.areTopicsConnected('topic1', 'topic2');

      expect(connected).toBe(false);
    });
  });

  describe('getTopicDistance', () => {
    it('should return 0 for same topic', async () => {
      const topic = new Topic({
        id: 'topic',
        name: 'Topic',
        content: 'Content',
      });

      mockRepository.addTopic(topic);

      const distance = await pathFinder.getTopicDistance('topic', 'topic');

      expect(distance).toBe(0);
    });

    it('should return 1 for directly connected topics', async () => {
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

      const distance = await pathFinder.getTopicDistance('parent', 'child');

      expect(distance).toBe(1);
    });

    it('should return -1 for disconnected topics', async () => {
      const topic1 = new Topic({
        id: 'topic1',
        name: 'Topic 1',
        content: 'Content 1',
      });

      const topic2 = new Topic({
        id: 'topic2',
        name: 'Topic 2',
        content: 'Content 2',
      });

      mockRepository.addTopic(topic1);
      mockRepository.addTopic(topic2);

      const distance = await pathFinder.getTopicDistance('topic1', 'topic2');

      expect(distance).toBe(-1);
    });
  });
});
