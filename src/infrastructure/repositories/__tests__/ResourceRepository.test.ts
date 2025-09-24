import { ResourceRepository } from '../ResourceRepository';
import { TopicRepository } from '../TopicRepository';
import { FileDatabase } from '../../database/FileDatabase';
import { Resource } from '../../../domain/entities/Resource';
import { Topic } from '../../../domain/entities/Topic';
import { ResourceType } from '../../../domain/enums/ResourceType';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('ResourceRepository', () => {
  let repository: ResourceRepository;
  let topicRepository: TopicRepository;
  let database: FileDatabase;
  let testDbPath: string;
  let testTopic: Topic;

  beforeEach(async () => {
    // Create temporary database for testing
    testDbPath = path.join(__dirname, `test_db_${Date.now()}.json`);
    database = new FileDatabase(testDbPath);
    await database.initialize();
    repository = new ResourceRepository(database);
    topicRepository = new TopicRepository(database);

    // Create a test topic for resources
    testTopic = await topicRepository.create(
      new Topic({
        name: 'Test Topic',
        content: 'Test content',
      })
    );
  });

  afterEach(async () => {
    // Clean up test database
    await database.close();
    try {
      await fs.unlink(testDbPath);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('create', () => {
    it('should create a new resource', async () => {
      const resource = new Resource({
        topicId: testTopic.id,
        url: 'https://example.com',
        description: 'Test resource',
        type: ResourceType.ARTICLE,
      });

      const createdResource = await repository.create(resource);

      expect(createdResource.id).toBeDefined();
      expect(createdResource.topicId).toBe(testTopic.id);
      expect(createdResource.url).toBe('https://example.com');
      expect(createdResource.description).toBe('Test resource');
      expect(createdResource.type).toBe(ResourceType.ARTICLE);
    });

    it('should throw error for invalid resource', async () => {
      const resource = new Resource({
        topicId: testTopic.id,
        url: '', // Invalid empty URL
        description: 'Test resource',
        type: ResourceType.ARTICLE,
      });

      await expect(repository.create(resource)).rejects.toThrow(
        'Invalid resource data'
      );
    });

    it('should throw error for non-existent topic', async () => {
      const resource = new Resource({
        topicId: 'non-existent-topic',
        url: 'https://example.com',
        description: 'Test resource',
        type: ResourceType.ARTICLE,
      });

      await expect(repository.create(resource)).rejects.toThrow(
        'Topic with ID non-existent-topic not found'
      );
    });

    it('should throw error for duplicate ID', async () => {
      const resource1 = new Resource({
        topicId: testTopic.id,
        url: 'https://example.com',
        description: 'Test resource 1',
        type: ResourceType.ARTICLE,
        id: 'resource_1',
      });

      const resource2 = new Resource({
        topicId: testTopic.id,
        url: 'https://example2.com',
        description: 'Test resource 2',
        type: ResourceType.VIDEO,
        id: 'resource_1', // Same ID
      });

      await repository.create(resource1);
      await expect(repository.create(resource2)).rejects.toThrow(
        'Resource with ID resource_1 already exists'
      );
    });
  });

  describe('findById', () => {
    it('should find resource by ID', async () => {
      const resource = new Resource({
        topicId: testTopic.id,
        url: 'https://example.com',
        description: 'Test resource',
        type: ResourceType.ARTICLE,
      });

      const createdResource = await repository.create(resource);
      const foundResource = await repository.findById(createdResource.id);

      expect(foundResource).not.toBeNull();
      expect(foundResource!.id).toBe(createdResource.id);
      expect(foundResource!.url).toBe('https://example.com');
    });

    it('should return null for non-existent resource', async () => {
      const foundResource = await repository.findById('non-existent');
      expect(foundResource).toBeNull();
    });
  });

  describe('update', () => {
    it('should update resource', async () => {
      const resource = new Resource({
        topicId: testTopic.id,
        url: 'https://example.com',
        description: 'Test resource',
        type: ResourceType.ARTICLE,
      });

      const createdResource = await repository.create(resource);
      const updatedResource = await repository.update(createdResource.id, {
        url: 'https://updated.com',
        description: 'Updated resource',
        type: ResourceType.VIDEO,
      });

      expect(updatedResource.url).toBe('https://updated.com');
      expect(updatedResource.description).toBe('Updated resource');
      expect(updatedResource.type).toBe(ResourceType.VIDEO);
      expect(updatedResource.id).toBe(createdResource.id);
    });

    it('should throw error for non-existent resource', async () => {
      await expect(
        repository.update('non-existent', { url: 'https://updated.com' })
      ).rejects.toThrow('Resource with ID non-existent not found');
    });
  });

  describe('delete', () => {
    it('should delete resource', async () => {
      const resource = new Resource({
        topicId: testTopic.id,
        url: 'https://example.com',
        description: 'Test resource',
        type: ResourceType.ARTICLE,
      });

      const createdResource = await repository.create(resource);
      const deleted = await repository.delete(createdResource.id);

      expect(deleted).toBe(true);
      expect(await repository.findById(createdResource.id)).toBeNull();
    });

    it('should return false for non-existent resource', async () => {
      const deleted = await repository.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('findByTopicId', () => {
    it('should find resources by topic ID', async () => {
      const resource1 = new Resource({
        topicId: testTopic.id,
        url: 'https://example1.com',
        description: 'Test resource 1',
        type: ResourceType.ARTICLE,
      });

      const resource2 = new Resource({
        topicId: testTopic.id,
        url: 'https://example2.com',
        description: 'Test resource 2',
        type: ResourceType.VIDEO,
      });

      // Create another topic and resource
      const otherTopic = await topicRepository.create(
        new Topic({
          name: 'Other Topic',
          content: 'Other content',
        })
      );

      const resource3 = new Resource({
        topicId: otherTopic.id,
        url: 'https://example3.com',
        description: 'Test resource 3',
        type: ResourceType.PDF,
      });

      await repository.create(resource1);
      await repository.create(resource2);
      await repository.create(resource3);

      const topicResources = await repository.findByTopicId(testTopic.id);

      expect(topicResources).toHaveLength(2);
      expect(topicResources.map((r) => r.url)).toContain(
        'https://example1.com'
      );
      expect(topicResources.map((r) => r.url)).toContain(
        'https://example2.com'
      );
    });
  });

  describe('findByType', () => {
    it('should find resources by type', async () => {
      const resource1 = new Resource({
        topicId: testTopic.id,
        url: 'https://example1.com',
        description: 'Test article 1',
        type: ResourceType.ARTICLE,
      });

      const resource2 = new Resource({
        topicId: testTopic.id,
        url: 'https://example2.com',
        description: 'Test article 2',
        type: ResourceType.ARTICLE,
      });

      const resource3 = new Resource({
        topicId: testTopic.id,
        url: 'https://example3.com',
        description: 'Test video',
        type: ResourceType.VIDEO,
      });

      await repository.create(resource1);
      await repository.create(resource2);
      await repository.create(resource3);

      const articleResources = await repository.findByType(
        ResourceType.ARTICLE
      );

      expect(articleResources).toHaveLength(2);
      expect(articleResources.map((r) => r.description)).toContain(
        'Test article 1'
      );
      expect(articleResources.map((r) => r.description)).toContain(
        'Test article 2'
      );
    });
  });

  describe('findByUrl', () => {
    it('should find resources by URL', async () => {
      const resource1 = new Resource({
        topicId: testTopic.id,
        url: 'https://example.com',
        description: 'Test resource 1',
        type: ResourceType.ARTICLE,
      });

      const resource2 = new Resource({
        topicId: testTopic.id,
        url: 'https://example.com', // Same URL
        description: 'Test resource 2',
        type: ResourceType.VIDEO,
      });

      await repository.create(resource1);
      await repository.create(resource2);

      const urlResources = await repository.findByUrl('https://example.com');

      expect(urlResources).toHaveLength(2);
      expect(urlResources.map((r) => r.description)).toContain(
        'Test resource 1'
      );
      expect(urlResources.map((r) => r.description)).toContain(
        'Test resource 2'
      );
    });
  });

  describe('countByTopicId', () => {
    it('should count resources for a topic', async () => {
      const resource1 = new Resource({
        topicId: testTopic.id,
        url: 'https://example1.com',
        description: 'Test resource 1',
        type: ResourceType.ARTICLE,
      });

      const resource2 = new Resource({
        topicId: testTopic.id,
        url: 'https://example2.com',
        description: 'Test resource 2',
        type: ResourceType.VIDEO,
      });

      await repository.create(resource1);
      await repository.create(resource2);

      const count = await repository.countByTopicId(testTopic.id);
      expect(count).toBe(2);
    });

    it('should return 0 for topic with no resources', async () => {
      const count = await repository.countByTopicId(testTopic.id);
      expect(count).toBe(0);
    });
  });

  describe('existsByTopicAndUrl', () => {
    it('should check if resource exists by topic and URL', async () => {
      const resource = new Resource({
        topicId: testTopic.id,
        url: 'https://example.com',
        description: 'Test resource',
        type: ResourceType.ARTICLE,
      });

      await repository.create(resource);

      const exists = await repository.existsByTopicAndUrl(
        testTopic.id,
        'https://example.com'
      );
      const notExists = await repository.existsByTopicAndUrl(
        testTopic.id,
        'https://other.com'
      );

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });

  describe('deleteByTopicId', () => {
    it('should delete all resources for a topic', async () => {
      const resource1 = new Resource({
        topicId: testTopic.id,
        url: 'https://example1.com',
        description: 'Test resource 1',
        type: ResourceType.ARTICLE,
      });

      const resource2 = new Resource({
        topicId: testTopic.id,
        url: 'https://example2.com',
        description: 'Test resource 2',
        type: ResourceType.VIDEO,
      });

      await repository.create(resource1);
      await repository.create(resource2);

      const deletedCount = await repository.deleteByTopicId(testTopic.id);

      expect(deletedCount).toBe(2);
      expect(await repository.countByTopicId(testTopic.id)).toBe(0);
    });
  });

  describe('updateTopicId', () => {
    it('should update topic ID for all resources', async () => {
      const newTopic = await topicRepository.create(
        new Topic({
          name: 'New Topic',
          content: 'New content',
        })
      );

      const resource1 = new Resource({
        topicId: testTopic.id,
        url: 'https://example1.com',
        description: 'Test resource 1',
        type: ResourceType.ARTICLE,
      });

      const resource2 = new Resource({
        topicId: testTopic.id,
        url: 'https://example2.com',
        description: 'Test resource 2',
        type: ResourceType.VIDEO,
      });

      await repository.create(resource1);
      await repository.create(resource2);

      const updatedCount = await repository.updateTopicId(
        testTopic.id,
        newTopic.id
      );

      expect(updatedCount).toBe(2);
      expect(await repository.countByTopicId(testTopic.id)).toBe(0);
      expect(await repository.countByTopicId(newTopic.id)).toBe(2);
    });

    it('should throw error for non-existent target topic', async () => {
      await expect(
        repository.updateTopicId(testTopic.id, 'non-existent')
      ).rejects.toThrow('Target topic with ID non-existent not found');
    });
  });
});
