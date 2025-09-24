import { Topic } from '../Topic';
import { EntityUtils } from '../../utils/EntityUtils';

describe('Topic', () => {
  let validTopicData: {
    name: string;
    content: string;
  };

  beforeEach(() => {
    validTopicData = {
      name: 'Test Topic',
      content: 'This is test content for the topic.',
    };
  });

  describe('constructor', () => {
    it('should create topic with provided data', () => {
      const topic = new Topic(validTopicData);

      expect(topic.name).toBe(validTopicData.name);
      expect(topic.content).toBe(validTopicData.content);
      expect(topic.version).toBe(1);
      expect(topic.id).toBeDefined();
      expect(topic.createdAt).toBeInstanceOf(Date);
      expect(topic.updatedAt).toBeInstanceOf(Date);
      expect(topic.parentTopicId).toBeUndefined();
    });

    it('should create topic with custom properties', () => {
      const customId = EntityUtils.generateId();
      const customDate = new Date('2023-01-01');
      const parentId = EntityUtils.generateId();

      const topic = new Topic({
        ...validTopicData,
        id: customId,
        version: 5,
        parentTopicId: parentId,
        createdAt: customDate,
        updatedAt: customDate,
      });

      expect(topic.id).toBe(customId);
      expect(topic.version).toBe(5);
      expect(topic.parentTopicId).toBe(parentId);
      expect(topic.createdAt).toBe(customDate);
      expect(topic.updatedAt).toBe(customDate);
    });
  });

  describe('validation methods', () => {
    let topic: Topic;

    beforeEach(() => {
      topic = new Topic(validTopicData);
    });

    describe('isValid', () => {
      it('should return true for valid topic', () => {
        expect(topic.isValid()).toBe(true);
      });

      it('should return false for topic with invalid name', () => {
        topic.name = '';
        expect(topic.isValid()).toBe(false);
      });

      it('should return false for topic with invalid content', () => {
        topic.content = 'x'.repeat(10001); // Too long
        expect(topic.isValid()).toBe(false);
      });

      it('should return false for topic with invalid version', () => {
        topic.version = 0;
        expect(topic.isValid()).toBe(false);
      });

      it('should return false for topic with invalid parent ID', () => {
        topic.parentTopicId = topic.id; // Self-reference
        expect(topic.isValid()).toBe(false);
      });
    });

    describe('isValidName', () => {
      it('should return true for valid names', () => {
        const validNames = [
          'Topic',
          'A',
          'Very Long Topic Name That Is Still Valid',
          'Topic with numbers 123',
          'Topic-with-dashes',
          'Topic_with_underscores',
        ];

        validNames.forEach((name) => {
          topic.name = name;
          expect(topic.isValidName()).toBe(true);
        });
      });

      it('should return false for invalid names', () => {
        const invalidNames = [
          '',
          '   ',
          'x'.repeat(201), // Too long
        ];

        invalidNames.forEach((name) => {
          topic.name = name;
          expect(topic.isValidName()).toBe(false);
        });
      });
    });

    describe('isValidContent', () => {
      it('should return true for valid content', () => {
        const validContents = [
          '',
          'Short content',
          'x'.repeat(10000), // Max length
        ];

        validContents.forEach((content) => {
          topic.content = content;
          expect(topic.isValidContent()).toBe(true);
        });
      });

      it('should return false for invalid content', () => {
        topic.content = 'x'.repeat(10001); // Too long
        expect(topic.isValidContent()).toBe(false);
      });
    });

    describe('isValidVersion', () => {
      it('should return true for valid versions', () => {
        const validVersions = [1, 2, 100, 999999];

        validVersions.forEach((version) => {
          topic.version = version;
          expect(topic.isValidVersion()).toBe(true);
        });
      });

      it('should return false for invalid versions', () => {
        const invalidVersions = [0, -1, 1.5, NaN];

        invalidVersions.forEach((version) => {
          topic.version = version;
          expect(topic.isValidVersion()).toBe(false);
        });
      });
    });

    describe('isValidParentId', () => {
      it('should return true for valid parent IDs', () => {
        topic.parentTopicId = undefined;
        expect(topic.isValidParentId()).toBe(true);

        topic.parentTopicId = EntityUtils.generateId();
        expect(topic.isValidParentId()).toBe(true);
      });

      it('should return false for invalid parent IDs', () => {
        topic.parentTopicId = '';
        expect(topic.isValidParentId()).toBe(false);

        topic.parentTopicId = topic.id; // Self-reference
        expect(topic.isValidParentId()).toBe(false);
      });
    });
  });

  describe('IVersionable implementation', () => {
    let topic: Topic;

    beforeEach(() => {
      topic = new Topic(validTopicData);
    });

    describe('createNewVersion', () => {
      it('should create new version with incremented version number', async () => {
        const originalVersion = topic.version;
        const originalCreatedAt = topic.createdAt;

        // Add small delay to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 10));
        const newVersion = topic.createNewVersion();

        expect(newVersion.version).toBe(originalVersion + 1);
        expect(newVersion.name).toBe(topic.name);
        expect(newVersion.content).toBe(topic.content);
        expect(newVersion.parentTopicId).toBe(topic.parentTopicId);
        expect(newVersion.createdAt).toBe(originalCreatedAt); // Should keep original
        expect(newVersion.updatedAt.getTime()).toBeGreaterThan(
          topic.updatedAt.getTime()
        );
        expect(newVersion.id).not.toBe(topic.id); // Should have new ID
      });
    });
  });

  describe('IHierarchical implementation', () => {
    let topic: Topic;

    beforeEach(() => {
      topic = new Topic(validTopicData);
    });

    describe('parentId getter', () => {
      it('should return parentTopicId', () => {
        expect(topic.parentId).toBeUndefined();

        const parentId = EntityUtils.generateId();
        topic.parentTopicId = parentId;
        expect(topic.parentId).toBe(parentId);
      });
    });

    describe('getChildren', () => {
      it('should return empty array initially', async () => {
        const children = await topic.getChildren();
        expect(children).toEqual([]);
      });

      it('should return copy of children array', async () => {
        const child = new Topic({ name: 'Child', content: 'Child content' });
        topic.addChild(child);

        const children = await topic.getChildren();
        expect(children).toHaveLength(1);
        expect(children[0]).toBe(child);

        // Modifying returned array should not affect original
        children.push(new Topic({ name: 'Another', content: 'Another' }));
        const childrenAgain = await topic.getChildren();
        expect(childrenAgain).toHaveLength(1);
      });
    });

    describe('getParent', () => {
      it('should return null (placeholder implementation)', async () => {
        const parent = await topic.getParent();
        expect(parent).toBeNull();
      });
    });
  });

  describe('Composite pattern methods', () => {
    let parentTopic: Topic;
    let childTopic: Topic;

    beforeEach(() => {
      parentTopic = new Topic({ name: 'Parent', content: 'Parent content' });
      childTopic = new Topic({ name: 'Child', content: 'Child content' });
    });

    describe('addChild', () => {
      it('should add child successfully', () => {
        parentTopic.addChild(childTopic);

        expect(parentTopic.hasChild(childTopic.id)).toBe(true);
        expect(childTopic.parentTopicId).toBe(parentTopic.id);
        expect(parentTopic.getChildCount()).toBe(1);
      });

      it('should throw error for null child', () => {
        expect(() => parentTopic.addChild(null as any)).toThrow(
          'Child topic cannot be null or undefined'
        );
      });

      it('should throw error for self-reference', () => {
        expect(() => parentTopic.addChild(parentTopic)).toThrow(
          'Cannot add topic as child of itself'
        );
      });

      it('should throw error for duplicate child', () => {
        parentTopic.addChild(childTopic);
        expect(() => parentTopic.addChild(childTopic)).toThrow(
          'Child topic already exists'
        );
      });

      it('should prevent circular references', () => {
        parentTopic.addChild(childTopic);
        expect(() => childTopic.addChild(parentTopic)).toThrow(
          'Cannot add child: would create circular reference'
        );
      });
    });

    describe('removeChild', () => {
      beforeEach(() => {
        parentTopic.addChild(childTopic);
      });

      it('should remove child successfully', () => {
        const result = parentTopic.removeChild(childTopic.id);

        expect(result).toBe(true);
        expect(parentTopic.hasChild(childTopic.id)).toBe(false);
        expect(childTopic.parentTopicId).toBeUndefined();
        expect(parentTopic.getChildCount()).toBe(0);
      });

      it('should return false for non-existent child', () => {
        const result = parentTopic.removeChild('non-existent-id');
        expect(result).toBe(false);
      });
    });

    describe('hasChild', () => {
      it('should return false for non-existent child', () => {
        expect(parentTopic.hasChild(childTopic.id)).toBe(false);
      });

      it('should return true for existing child', () => {
        parentTopic.addChild(childTopic);
        expect(parentTopic.hasChild(childTopic.id)).toBe(true);
      });
    });

    describe('getAllDescendants', () => {
      it('should return empty array for leaf topic', () => {
        const descendants = parentTopic.getAllDescendants();
        expect(descendants).toEqual([]);
      });

      it('should return all descendants recursively', () => {
        const grandChild = new Topic({
          name: 'GrandChild',
          content: 'GrandChild content',
        });

        parentTopic.addChild(childTopic);
        childTopic.addChild(grandChild);

        const descendants = parentTopic.getAllDescendants();
        expect(descendants).toHaveLength(2);
        expect(descendants).toContain(childTopic);
        expect(descendants).toContain(grandChild);
      });
    });

    describe('hierarchy utility methods', () => {
      it('should correctly identify root topics', () => {
        expect(parentTopic.isRoot()).toBe(true);

        parentTopic.addChild(childTopic);
        expect(childTopic.isRoot()).toBe(false);
      });

      it('should correctly identify leaf topics', () => {
        expect(parentTopic.isLeaf()).toBe(true);

        parentTopic.addChild(childTopic);
        expect(parentTopic.isLeaf()).toBe(false);
        expect(childTopic.isLeaf()).toBe(true);
      });

      it('should return correct child count', () => {
        expect(parentTopic.getChildCount()).toBe(0);

        parentTopic.addChild(childTopic);
        expect(parentTopic.getChildCount()).toBe(1);
      });

      it('should return correct descendant count', () => {
        const grandChild = new Topic({
          name: 'GrandChild',
          content: 'GrandChild content',
        });

        expect(parentTopic.getDescendantCount()).toBe(0);

        parentTopic.addChild(childTopic);
        expect(parentTopic.getDescendantCount()).toBe(1);

        childTopic.addChild(grandChild);
        expect(parentTopic.getDescendantCount()).toBe(2);
      });

      it('should return correct depth level', () => {
        expect(parentTopic.getDepthLevel()).toBe(0); // Root topic

        parentTopic.addChild(childTopic);
        expect(childTopic.getDepthLevel()).toBe(1); // Has parent
      });
    });
  });

  describe('update methods', () => {
    let topic: Topic;

    beforeEach(() => {
      topic = new Topic(validTopicData);
    });

    describe('updateName', () => {
      it('should update name successfully', async () => {
        const newName = 'Updated Topic Name';
        const originalUpdatedAt = topic.updatedAt;

        await new Promise((resolve) => setTimeout(resolve, 10));
        topic.updateName(newName);

        expect(topic.name).toBe(newName);
        expect(topic.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      });

      it('should throw error for invalid names', () => {
        expect(() => topic.updateName('')).toThrow('Invalid name provided');
        expect(() => topic.updateName('   ')).toThrow(
          'Name must be between 1 and 200 characters'
        );
        expect(() => topic.updateName('x'.repeat(201))).toThrow(
          'Name must be between 1 and 200 characters'
        );
      });
    });

    describe('updateContent', () => {
      it('should update content successfully', async () => {
        const newContent = 'Updated content for the topic.';
        const originalUpdatedAt = topic.updatedAt;

        await new Promise((resolve) => setTimeout(resolve, 10));
        topic.updateContent(newContent);

        expect(topic.content).toBe(newContent);
        expect(topic.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      });

      it('should throw error for invalid content', () => {
        expect(() => topic.updateContent(123 as any)).toThrow(
          'Invalid content provided'
        );
        expect(() => topic.updateContent('x'.repeat(10001))).toThrow(
          'Content cannot exceed 10,000 characters'
        );
      });
    });

    describe('updateParent', () => {
      it('should update parent successfully', async () => {
        const newParentId = EntityUtils.generateId();
        const originalUpdatedAt = topic.updatedAt;

        await new Promise((resolve) => setTimeout(resolve, 10));
        topic.updateParent(newParentId);

        expect(topic.parentTopicId).toBe(newParentId);
        expect(topic.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      });

      it('should clear parent when undefined provided', async () => {
        topic.parentTopicId = EntityUtils.generateId();

        await new Promise((resolve) => setTimeout(resolve, 10));
        topic.updateParent(undefined);

        expect(topic.parentTopicId).toBeUndefined();
      });

      it('should throw error for invalid parent ID', () => {
        expect(() => topic.updateParent('')).toThrow(
          'Invalid parent ID provided'
        );
        expect(() => topic.updateParent(topic.id)).toThrow(
          'Topic cannot be its own parent'
        );
      });
    });
  });

  describe('toSafeObject', () => {
    it('should return safe object without circular references', () => {
      const topic = new Topic(validTopicData);
      const child = new Topic({ name: 'Child', content: 'Child content' });
      topic.addChild(child);

      const safeObject = topic.toSafeObject();

      expect(safeObject.id).toBe(topic.id);
      expect(safeObject.name).toBe(topic.name);
      expect(safeObject.content).toBe(topic.content);
      expect(safeObject.childIds).toEqual([child.id]);
      expect('children' in safeObject).toBe(false);
      expect('updateTimestamp' in safeObject).toBe(false);
    });
  });
});
