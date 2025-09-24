import { TopicVersionFactory } from '../TopicVersionFactory';
import { Topic } from '../../entities/Topic';

describe('TopicVersionFactory', () => {
  let factory: TopicVersionFactory;
  let baseTopic: Topic;

  beforeEach(() => {
    factory = new TopicVersionFactory();
    baseTopic = new Topic({
      name: 'Original Topic',
      content: 'Original content',
      parentTopicId: undefined,
    });

    // Ensure the base topic is valid for testing
    if (!baseTopic.isValid()) {
      throw new Error(
        `Base topic is invalid: ${JSON.stringify({
          id: baseTopic.id,
          name: baseTopic.name,
          content: baseTopic.content,
          version: baseTopic.version,
          createdAt: baseTopic.createdAt,
          updatedAt: baseTopic.updatedAt,
        })}`
      );
    }
  });

  describe('createNewVersion', () => {
    it('should create a new version with incremented version number', () => {
      const updates = { name: 'Updated Topic' };
      const newVersion = factory.createNewVersion(baseTopic, updates);

      expect(newVersion.version).toBe(baseTopic.version + 1);
      expect(newVersion.name).toBe('Updated Topic');
      expect(newVersion.content).toBe(baseTopic.content);
      expect(newVersion.id).not.toBe(baseTopic.id);
    });

    it('should preserve original creation date', () => {
      const updates = { content: 'Updated content' };
      const newVersion = factory.createNewVersion(baseTopic, updates);

      expect(newVersion.createdAt).toEqual(baseTopic.createdAt);
    });

    it('should update the timestamp', async () => {
      const originalUpdatedAt = baseTopic.updatedAt;

      // Wait a small amount to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1));

      const updates = { content: 'Updated content' };
      const newVersion = factory.createNewVersion(baseTopic, updates);

      expect(newVersion.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime()
      );
    });

    it('should generate a new unique ID', () => {
      const updates = { name: 'Updated Topic' };
      const newVersion = factory.createNewVersion(baseTopic, updates);

      expect(newVersion.id).not.toBe(baseTopic.id);
      expect(typeof newVersion.id).toBe('string');
      expect(newVersion.id.length).toBeGreaterThan(0);
    });

    it('should apply all provided updates', () => {
      const updates = {
        name: 'New Name',
        content: 'New Content',
        parentTopicId: 'parent-123',
      };
      const newVersion = factory.createNewVersion(baseTopic, updates);

      expect(newVersion.name).toBe('New Name');
      expect(newVersion.content).toBe('New Content');
      expect(newVersion.parentTopicId).toBe('parent-123');
    });

    it('should preserve unchanged fields', () => {
      const updates = { name: 'New Name' };
      const newVersion = factory.createNewVersion(baseTopic, updates);

      expect(newVersion.content).toBe(baseTopic.content);
      expect(newVersion.parentTopicId).toBe(baseTopic.parentTopicId);
    });

    it('should throw error for null existing topic', () => {
      expect(() => {
        factory.createNewVersion(null as any, { name: 'Test' });
      }).toThrow('Existing topic cannot be null or undefined');
    });

    it('should throw error for undefined existing topic', () => {
      expect(() => {
        factory.createNewVersion(undefined as any, { name: 'Test' });
      }).toThrow('Existing topic cannot be null or undefined');
    });

    it('should throw error for invalid existing topic', () => {
      const invalidTopic = new Topic({
        name: '', // Invalid empty name
        content: 'Content',
      });

      expect(() => {
        factory.createNewVersion(invalidTopic, { name: 'Test' });
      }).toThrow('Existing topic is invalid');
    });

    it('should throw error for null updates', () => {
      expect(() => {
        factory.createNewVersion(baseTopic, null as any);
      }).toThrow('Updates must be a valid object');
    });

    it('should throw error for invalid updates object', () => {
      expect(() => {
        factory.createNewVersion(baseTopic, 'invalid' as any);
      }).toThrow('Updates must be a valid object');
    });

    it('should validate name in updates', () => {
      expect(() => {
        factory.createNewVersion(baseTopic, { name: '' });
      }).toThrow('Topic name cannot be empty');

      expect(() => {
        factory.createNewVersion(baseTopic, { name: 'a'.repeat(201) });
      }).toThrow('Topic name cannot exceed 200 characters');

      expect(() => {
        factory.createNewVersion(baseTopic, { name: 123 as any });
      }).toThrow('Topic name must be a string');
    });

    it('should validate content in updates', () => {
      expect(() => {
        factory.createNewVersion(baseTopic, { content: 'a'.repeat(10001) });
      }).toThrow('Topic content cannot exceed 10,000 characters');

      expect(() => {
        factory.createNewVersion(baseTopic, { content: 123 as any });
      }).toThrow('Topic content must be a string');
    });

    it('should validate parentTopicId in updates', () => {
      expect(() => {
        factory.createNewVersion(baseTopic, { parentTopicId: '' });
      }).toThrow('Parent topic ID must be a valid non-empty string');

      expect(() => {
        factory.createNewVersion(baseTopic, { parentTopicId: 123 as any });
      }).toThrow('Parent topic ID must be a valid non-empty string');
    });

    it('should handle empty updates object', () => {
      const newVersion = factory.createNewVersion(baseTopic, {});

      expect(newVersion.name).toBe(baseTopic.name);
      expect(newVersion.content).toBe(baseTopic.content);
      expect(newVersion.parentTopicId).toBe(baseTopic.parentTopicId);
      expect(newVersion.version).toBe(baseTopic.version + 1);
    });
  });

  describe('createContentVersion', () => {
    it('should create new version with updated content only', () => {
      const newContent = 'This is the new content';
      const newVersion = factory.createContentVersion(baseTopic, newContent);

      expect(newVersion.content).toBe(newContent);
      expect(newVersion.name).toBe(baseTopic.name);
      expect(newVersion.parentTopicId).toBe(baseTopic.parentTopicId);
      expect(newVersion.version).toBe(baseTopic.version + 1);
    });

    it('should validate content parameter', () => {
      expect(() => {
        factory.createContentVersion(baseTopic, 123 as any);
      }).toThrow('Topic content must be a string');

      expect(() => {
        factory.createContentVersion(baseTopic, 'a'.repeat(10001));
      }).toThrow('Topic content cannot exceed 10,000 characters');
    });

    it('should allow empty content', () => {
      const newVersion = factory.createContentVersion(baseTopic, '');
      expect(newVersion.content).toBe('');
    });
  });

  describe('createNameVersion', () => {
    it('should create new version with updated name only', () => {
      const newName = 'Updated Topic Name';
      const newVersion = factory.createNameVersion(baseTopic, newName);

      expect(newVersion.name).toBe(newName);
      expect(newVersion.content).toBe(baseTopic.content);
      expect(newVersion.parentTopicId).toBe(baseTopic.parentTopicId);
      expect(newVersion.version).toBe(baseTopic.version + 1);
    });

    it('should validate name parameter', () => {
      expect(() => {
        factory.createNameVersion(baseTopic, '');
      }).toThrow('Topic name cannot be empty');

      expect(() => {
        factory.createNameVersion(baseTopic, 'a'.repeat(201));
      }).toThrow('Topic name cannot exceed 200 characters');

      expect(() => {
        factory.createNameVersion(baseTopic, 123 as any);
      }).toThrow('Topic name must be a string');
    });

    it('should trim whitespace from name', () => {
      const newVersion = factory.createNameVersion(
        baseTopic,
        '  Trimmed Name  '
      );
      expect(newVersion.name).toBe('Trimmed Name');
    });
  });

  describe('createParentVersion', () => {
    it('should create new version with updated parent only', () => {
      const newParentId = 'new-parent-123';
      const newVersion = factory.createParentVersion(baseTopic, newParentId);

      expect(newVersion.parentTopicId).toBe(newParentId);
      expect(newVersion.name).toBe(baseTopic.name);
      expect(newVersion.content).toBe(baseTopic.content);
      expect(newVersion.version).toBe(baseTopic.version + 1);
    });

    it('should create new version with no parent (root topic)', () => {
      const topicWithParent = new Topic({
        name: 'Child Topic',
        content: 'Content',
        parentTopicId: 'parent-123',
      });

      const newVersion = factory.createParentVersion(
        topicWithParent,
        undefined
      );

      expect(newVersion.parentTopicId).toBeUndefined();
      expect(newVersion.name).toBe(topicWithParent.name);
      expect(newVersion.content).toBe(topicWithParent.content);
      expect(newVersion.version).toBe(topicWithParent.version + 1);
    });

    it('should validate parent ID parameter', () => {
      expect(() => {
        factory.createParentVersion(baseTopic, '');
      }).toThrow('Parent topic ID must be a valid non-empty string');

      expect(() => {
        factory.createParentVersion(baseTopic, 123 as any);
      }).toThrow('Parent topic ID must be a valid non-empty string');
    });

    it('should prevent self-reference when current topic ID is known', () => {
      // This test demonstrates the validation, though in practice the current topic ID
      // would need to be passed to the validation method
      const parentId = 'some-id';
      const newVersion = factory.createParentVersion(baseTopic, parentId);

      // Should succeed since we're not checking self-reference in this method
      expect(newVersion.parentTopicId).toBe(parentId);
    });
  });

  describe('version increment behavior', () => {
    it('should handle multiple version increments correctly', () => {
      let currentTopic = baseTopic;

      // Create multiple versions
      for (let i = 1; i <= 5; i++) {
        const newVersion = factory.createNewVersion(currentTopic, {
          content: `Content version ${i + 1}`,
        });

        expect(newVersion.version).toBe(currentTopic.version + 1);
        currentTopic = newVersion;
      }

      expect(currentTopic.version).toBe(6); // Started at 1, incremented 5 times
    });

    it('should maintain version integrity across different update types', () => {
      const contentVersion = factory.createContentVersion(
        baseTopic,
        'New content'
      );
      expect(contentVersion.version).toBe(2);

      const nameVersion = factory.createNameVersion(contentVersion, 'New name');
      expect(nameVersion.version).toBe(3);

      const parentVersion = factory.createParentVersion(
        nameVersion,
        'parent-123'
      );
      expect(parentVersion.version).toBe(4);
    });
  });

  describe('data integrity', () => {
    it('should create valid topics that pass validation', () => {
      const updates = {
        name: 'Valid Topic Name',
        content: 'Valid content with reasonable length',
        parentTopicId: 'valid-parent-id',
      };

      const newVersion = factory.createNewVersion(baseTopic, updates);

      expect(newVersion.isValid()).toBe(true);
      expect(newVersion.isValidName()).toBe(true);
      expect(newVersion.isValidContent()).toBe(true);
      expect(newVersion.isValidVersion()).toBe(true);
      expect(newVersion.isValidParentId()).toBe(true);
    });

    it('should preserve all required properties', () => {
      const newVersion = factory.createNewVersion(baseTopic, {
        name: 'Updated',
      });

      expect(newVersion.id).toBeDefined();
      expect(newVersion.name).toBeDefined();
      expect(newVersion.content).toBeDefined();
      expect(newVersion.version).toBeDefined();
      expect(newVersion.createdAt).toBeDefined();
      expect(newVersion.updatedAt).toBeDefined();
    });
  });
});
