import { EntityUtils } from '../EntityUtils';

describe('EntityUtils', () => {
  describe('generateId', () => {
    it('should generate a valid UUID', () => {
      const id = EntityUtils.generateId();
      expect(typeof id).toBe('string');
      expect(EntityUtils.isValidId(id)).toBe(true);
    });

    it('should generate unique IDs', () => {
      const id1 = EntityUtils.generateId();
      const id2 = EntityUtils.generateId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('isValidId', () => {
    it('should return true for valid UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ];

      validUUIDs.forEach((uuid) => {
        expect(EntityUtils.isValidId(uuid)).toBe(true);
      });
    });

    it('should return false for invalid UUIDs', () => {
      const invalidUUIDs = [
        'invalid-uuid',
        '123',
        '',
        '123e4567-e89b-12d3-a456-42661417400', // too short
        '123e4567-e89b-12d3-a456-4266141740000', // too long
        'ggge4567-e89b-12d3-a456-426614174000', // invalid characters
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(EntityUtils.isValidId(uuid)).toBe(false);
      });
    });
  });

  describe('isNonEmptyId', () => {
    it('should return true for non-empty strings', () => {
      expect(EntityUtils.isNonEmptyId('valid-id')).toBe(true);
      expect(EntityUtils.isNonEmptyId('123')).toBe(true);
    });

    it('should return false for empty or invalid strings', () => {
      expect(EntityUtils.isNonEmptyId('')).toBe(false);
      expect(EntityUtils.isNonEmptyId('   ')).toBe(false);
      expect(EntityUtils.isNonEmptyId(undefined)).toBe(false);
    });
  });

  describe('createTimestamp', () => {
    it('should create a valid Date object', () => {
      const timestamp = EntityUtils.createTimestamp();
      expect(timestamp).toBeInstanceOf(Date);
      expect(EntityUtils.isValidTimestamp(timestamp)).toBe(true);
    });

    it('should create timestamps close to current time', () => {
      const before = new Date();
      const timestamp = EntityUtils.createTimestamp();
      const after = new Date();

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('isValidTimestamp', () => {
    it('should return true for valid dates', () => {
      const validDates = [
        new Date(),
        new Date('2023-01-01'),
        new Date(Date.now() - 1000), // 1 second ago
      ];

      validDates.forEach((date) => {
        expect(EntityUtils.isValidTimestamp(date)).toBe(true);
      });
    });

    it('should return false for invalid dates', () => {
      const invalidDates = [new Date('invalid-date'), new Date(NaN)];

      invalidDates.forEach((date) => {
        expect(EntityUtils.isValidTimestamp(date)).toBe(false);
      });
    });

    it('should return false for future dates', () => {
      const futureDate = new Date(Date.now() + 10000); // 10 seconds in future
      expect(EntityUtils.isValidTimestamp(futureDate)).toBe(false);
    });
  });
});
