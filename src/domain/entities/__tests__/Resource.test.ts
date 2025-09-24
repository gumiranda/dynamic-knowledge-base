import { Resource } from '../Resource';
import { ResourceType } from '../../enums/ResourceType';
import { EntityUtils } from '../../utils/EntityUtils';

describe('Resource', () => {
  let validResourceData: {
    topicId: string;
    url: string;
    description: string;
    type: ResourceType;
  };

  beforeEach(() => {
    validResourceData = {
      topicId: EntityUtils.generateId(),
      url: 'https://example.com/resource',
      description: 'A test resource',
      type: ResourceType.LINK,
    };
  });

  describe('constructor', () => {
    it('should create resource with provided data', () => {
      const resource = new Resource(validResourceData);

      expect(resource.topicId).toBe(validResourceData.topicId);
      expect(resource.url).toBe(validResourceData.url);
      expect(resource.description).toBe(validResourceData.description);
      expect(resource.type).toBe(validResourceData.type);
      expect(resource.id).toBeDefined();
      expect(resource.createdAt).toBeInstanceOf(Date);
      expect(resource.updatedAt).toBeInstanceOf(Date);
    });

    it('should create resource with custom properties', () => {
      const customId = EntityUtils.generateId();
      const customDate = new Date('2023-01-01');

      const resource = new Resource({
        ...validResourceData,
        id: customId,
        createdAt: customDate,
        updatedAt: customDate,
      });

      expect(resource.id).toBe(customId);
      expect(resource.createdAt).toBe(customDate);
      expect(resource.updatedAt).toBe(customDate);
    });
  });

  describe('validation methods', () => {
    let resource: Resource;

    beforeEach(() => {
      resource = new Resource(validResourceData);
    });

    describe('isValid', () => {
      it('should return true for valid resource', () => {
        expect(resource.isValid()).toBe(true);
      });

      it('should return false for resource with invalid topic ID', () => {
        resource.topicId = '';
        expect(resource.isValid()).toBe(false);
      });

      it('should return false for resource with invalid URL', () => {
        resource.url = '';
        expect(resource.isValid()).toBe(false);
      });

      it('should return false for resource with invalid description', () => {
        resource.description = 'x'.repeat(1001); // Too long
        expect(resource.isValid()).toBe(false);
      });

      it('should return false for resource with invalid type', () => {
        (resource as any).type = 'invalid-type';
        expect(resource.isValid()).toBe(false);
      });
    });

    describe('isValidTopicId', () => {
      it('should return true for valid topic IDs', () => {
        expect(resource.isValidTopicId()).toBe(true);
      });

      it('should return false for invalid topic IDs', () => {
        resource.topicId = '';
        expect(resource.isValidTopicId()).toBe(false);

        resource.topicId = '   ';
        expect(resource.isValidTopicId()).toBe(false);
      });
    });

    describe('isValidUrl', () => {
      it('should return true for valid absolute URLs', () => {
        const validUrls = [
          'https://example.com',
          'http://example.com/path',
          'https://subdomain.example.com/path?query=value',
          'https://example.com:8080/path',
        ];

        validUrls.forEach((url) => {
          resource.url = url;
          expect(resource.isValidUrl()).toBe(true);
        });
      });

      it('should return true for valid relative URLs', () => {
        const validUrls = [
          '/path/to/resource',
          './relative/path',
          '../parent/path',
        ];

        validUrls.forEach((url) => {
          resource.url = url;
          expect(resource.isValidUrl()).toBe(true);
        });
      });

      it('should return true for domain-only URLs', () => {
        const validUrls = [
          'example.com',
          'subdomain.example.com',
          'example.co.uk',
        ];

        validUrls.forEach((url) => {
          resource.url = url;
          expect(resource.isValidUrl()).toBe(true);
        });
      });

      it('should return false for invalid URLs', () => {
        const invalidUrls = [
          '',
          '   ',
          'x'.repeat(2049), // Too long
          'ht tp://invalid-space.com',
        ];

        invalidUrls.forEach((url) => {
          resource.url = url;
          expect(resource.isValidUrl()).toBe(false);
        });
      });
    });

    describe('isValidDescription', () => {
      it('should return true for valid descriptions', () => {
        const validDescriptions = [
          '',
          'Short description',
          'x'.repeat(1000), // Max length
        ];

        validDescriptions.forEach((description) => {
          resource.description = description;
          expect(resource.isValidDescription()).toBe(true);
        });
      });

      it('should return false for invalid descriptions', () => {
        resource.description = 'x'.repeat(1001); // Too long
        expect(resource.isValidDescription()).toBe(false);
      });
    });

    describe('isValidType', () => {
      it('should return true for valid types', () => {
        const validTypes = Object.values(ResourceType);

        validTypes.forEach((type) => {
          resource.type = type;
          expect(resource.isValidType()).toBe(true);
        });
      });
    });
  });

  describe('update methods', () => {
    let resource: Resource;

    beforeEach(() => {
      resource = new Resource(validResourceData);
    });

    describe('updateUrl', () => {
      it('should update URL successfully', async () => {
        const newUrl = 'https://newexample.com/resource';
        const originalUpdatedAt = resource.updatedAt;

        await new Promise((resolve) => setTimeout(resolve, 10));
        resource.updateUrl(newUrl);

        expect(resource.url).toBe(newUrl);
        expect(resource.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      });

      it('should throw error for invalid URLs', () => {
        expect(() => resource.updateUrl('')).toThrow('Invalid URL provided');
        expect(() => resource.updateUrl('   ')).toThrow('URL cannot be empty');
        expect(() => resource.updateUrl('x'.repeat(2049))).toThrow(
          'URL cannot exceed 2048 characters'
        );
      });
    });

    describe('updateDescription', () => {
      it('should update description successfully', async () => {
        const newDescription = 'Updated description';
        const originalUpdatedAt = resource.updatedAt;

        await new Promise((resolve) => setTimeout(resolve, 10));
        resource.updateDescription(newDescription);

        expect(resource.description).toBe(newDescription);
        expect(resource.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      });

      it('should throw error for invalid descriptions', () => {
        expect(() => resource.updateDescription(123 as any)).toThrow(
          'Invalid description provided'
        );
        expect(() => resource.updateDescription('x'.repeat(1001))).toThrow(
          'Description cannot exceed 1000 characters'
        );
      });
    });

    describe('updateType', () => {
      it('should update type successfully', async () => {
        const newType = ResourceType.VIDEO;
        const originalUpdatedAt = resource.updatedAt;

        await new Promise((resolve) => setTimeout(resolve, 10));
        resource.updateType(newType);

        expect(resource.type).toBe(newType);
        expect(resource.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      });

      it('should throw error for invalid type', () => {
        expect(() => resource.updateType('invalid' as any)).toThrow(
          'Invalid resource type provided'
        );
      });
    });

    describe('updateTopicId', () => {
      it('should update topic ID successfully', async () => {
        const newTopicId = EntityUtils.generateId();
        const originalUpdatedAt = resource.updatedAt;

        await new Promise((resolve) => setTimeout(resolve, 10));
        resource.updateTopicId(newTopicId);

        expect(resource.topicId).toBe(newTopicId);
        expect(resource.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      });

      it('should throw error for invalid topic ID', () => {
        expect(() => resource.updateTopicId('')).toThrow(
          'Invalid topic ID provided'
        );
        expect(() => resource.updateTopicId('   ')).toThrow(
          'Topic ID cannot be empty'
        );
      });
    });
  });

  describe('utility methods', () => {
    let resource: Resource;

    beforeEach(() => {
      resource = new Resource(validResourceData);
    });

    describe('getTypeDisplayName', () => {
      it('should return correct display name', () => {
        resource.type = ResourceType.VIDEO;
        expect(resource.getTypeDisplayName()).toBe('Video');

        resource.type = ResourceType.PDF;
        expect(resource.getTypeDisplayName()).toBe('PDF Document');
      });
    });

    describe('URL type checking', () => {
      it('should correctly identify absolute URLs', () => {
        resource.url = 'https://example.com';
        expect(resource.isAbsoluteUrl()).toBe(true);
        expect(resource.isRelativeUrl()).toBe(false);

        resource.url = 'http://example.com';
        expect(resource.isAbsoluteUrl()).toBe(true);
        expect(resource.isRelativeUrl()).toBe(false);
      });

      it('should correctly identify relative URLs', () => {
        resource.url = '/path/to/resource';
        expect(resource.isAbsoluteUrl()).toBe(false);
        expect(resource.isRelativeUrl()).toBe(true);

        resource.url = './relative/path';
        expect(resource.isAbsoluteUrl()).toBe(false);
        expect(resource.isRelativeUrl()).toBe(true);
      });
    });

    describe('getDomain', () => {
      it('should return domain for absolute URLs', () => {
        resource.url = 'https://example.com/path';
        expect(resource.getDomain()).toBe('example.com');

        resource.url = 'https://subdomain.example.com:8080/path';
        expect(resource.getDomain()).toBe('subdomain.example.com');
      });

      it('should return null for relative URLs', () => {
        resource.url = '/path/to/resource';
        expect(resource.getDomain()).toBeNull();
      });
    });

    describe('isFromTrustedDomain', () => {
      it('should return true for trusted domains', () => {
        resource.url = 'https://example.com/path';
        expect(
          resource.isFromTrustedDomain(['example.com', 'trusted.com'])
        ).toBe(true);

        resource.url = 'https://sub.example.com/path';
        expect(resource.isFromTrustedDomain(['example.com'])).toBe(true);
      });

      it('should return false for untrusted domains', () => {
        resource.url = 'https://untrusted.com/path';
        expect(
          resource.isFromTrustedDomain(['example.com', 'trusted.com'])
        ).toBe(false);
      });

      it('should return false for relative URLs', () => {
        resource.url = '/path/to/resource';
        expect(resource.isFromTrustedDomain(['example.com'])).toBe(false);
      });
    });

    describe('suggestBetterType', () => {
      it('should suggest appropriate type based on URL', () => {
        resource.url = 'https://youtube.com/watch?v=123';
        expect(resource.suggestBetterType()).toBe(ResourceType.VIDEO);

        resource.url = 'https://example.com/document.pdf';
        expect(resource.suggestBetterType()).toBe(ResourceType.PDF);
      });
    });

    describe('hasAppropriateType', () => {
      it('should return true when type matches URL suggestion', () => {
        resource.url = 'https://youtube.com/watch?v=123';
        resource.type = ResourceType.VIDEO;
        expect(resource.hasAppropriateType()).toBe(true);
      });

      it('should return false when type does not match URL suggestion', () => {
        resource.url = 'https://youtube.com/watch?v=123';
        resource.type = ResourceType.ARTICLE;
        expect(resource.hasAppropriateType()).toBe(false);
      });
    });

    describe('getShortUrl', () => {
      it('should return full URL if within limit', () => {
        resource.url = 'https://example.com';
        expect(resource.getShortUrl(50)).toBe('https://example.com');
      });

      it('should shorten long URLs', () => {
        resource.url =
          'https://example.com/very/long/path/to/resource/that/exceeds/limit';
        const shortened = resource.getShortUrl(30);
        expect(shortened.length).toBeLessThanOrEqual(30);
        expect(shortened).toContain('example.com');
        expect(shortened).toContain('...');
      });

      it('should handle relative URLs', () => {
        resource.url =
          '/very/long/relative/path/that/exceeds/the/specified/limit';
        const shortened = resource.getShortUrl(20);
        expect(shortened.length).toBeLessThanOrEqual(20);
        expect(shortened).toContain('...');
      });
    });
  });

  describe('toSafeObject', () => {
    it('should return safe object without sensitive methods', () => {
      const resource = new Resource(validResourceData);
      const safeObject = resource.toSafeObject();

      expect(safeObject.id).toBe(resource.id);
      expect(safeObject.topicId).toBe(resource.topicId);
      expect(safeObject.url).toBe(resource.url);
      expect(safeObject.description).toBe(resource.description);
      expect(safeObject.type).toBe(resource.type);
      expect('updateTimestamp' in safeObject).toBe(false);
    });
  });
});
