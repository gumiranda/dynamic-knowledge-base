import { BaseEntity } from '../BaseEntity';
import { EntityUtils } from '../../utils/EntityUtils';

// Create a concrete implementation for testing
class TestEntity extends BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;

  constructor(name: string) {
    super();
    this.id = EntityUtils.generateId();
    this.createdAt = EntityUtils.createTimestamp();
    this.updatedAt = EntityUtils.createTimestamp();
    this.name = name;
  }

  updateName(newName: string): void {
    this.name = newName;
    this.updateTimestamp();
  }
}

describe('BaseEntity', () => {
  let testEntity: TestEntity;

  beforeEach(() => {
    testEntity = new TestEntity('Test Entity');
  });

  describe('constructor', () => {
    it('should create entity with valid properties', () => {
      expect(testEntity.id).toBeDefined();
      expect(testEntity.createdAt).toBeInstanceOf(Date);
      expect(testEntity.updatedAt).toBeInstanceOf(Date);
      expect(testEntity.name).toBe('Test Entity');
    });
  });

  describe('isValid', () => {
    it('should return true for valid entity', () => {
      expect(testEntity.isValid()).toBe(true);
    });

    it('should return false for entity with invalid id', () => {
      testEntity.id = '';
      expect(testEntity.isValid()).toBe(false);
    });

    it('should return false for entity with invalid createdAt', () => {
      testEntity.createdAt = new Date('invalid');
      expect(testEntity.isValid()).toBe(false);
    });

    it('should return false for entity with invalid updatedAt', () => {
      testEntity.updatedAt = new Date('invalid');
      expect(testEntity.isValid()).toBe(false);
    });

    it('should return false when updatedAt is before createdAt', () => {
      testEntity.updatedAt = new Date(testEntity.createdAt.getTime() - 1000);
      expect(testEntity.isValid()).toBe(false);
    });
  });

  describe('updateTimestamp', () => {
    it('should update the updatedAt timestamp', async () => {
      const originalUpdatedAt = testEntity.updatedAt;

      // Wait a small amount to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      testEntity.updateName('Updated Name');

      expect(testEntity.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
      expect(testEntity.name).toBe('Updated Name');
    });
  });

  describe('getAge', () => {
    it('should return positive age', () => {
      const age = testEntity.getAge();
      expect(age).toBeGreaterThanOrEqual(0);
      expect(typeof age).toBe('number');
    });

    it('should increase over time', async () => {
      const initialAge = testEntity.getAge();

      // Wait a small amount
      await new Promise((resolve) => setTimeout(resolve, 10));

      const laterAge = testEntity.getAge();
      expect(laterAge).toBeGreaterThan(initialAge);
    });
  });

  describe('isRecentlyCreated', () => {
    it('should return true for newly created entity', () => {
      expect(testEntity.isRecentlyCreated()).toBe(true);
    });

    it('should return false for old entity', () => {
      // Simulate old entity by setting createdAt to 2 hours ago
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      testEntity.createdAt = twoHoursAgo;

      expect(testEntity.isRecentlyCreated()).toBe(false);
    });
  });
});
