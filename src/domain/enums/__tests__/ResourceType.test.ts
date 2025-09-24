import { ResourceType, ResourceTypeUtils } from '../ResourceType';

describe('ResourceType', () => {
  describe('enum values', () => {
    it('should have correct enum values', () => {
      expect(ResourceType.VIDEO).toBe('video');
      expect(ResourceType.ARTICLE).toBe('article');
      expect(ResourceType.PDF).toBe('pdf');
      expect(ResourceType.DOCUMENT).toBe('document');
      expect(ResourceType.IMAGE).toBe('image');
      expect(ResourceType.AUDIO).toBe('audio');
      expect(ResourceType.LINK).toBe('link');
      expect(ResourceType.OTHER).toBe('other');
    });
  });
});

describe('ResourceTypeUtils', () => {
  describe('getAllTypes', () => {
    it('should return all resource types', () => {
      const types = ResourceTypeUtils.getAllTypes();
      expect(types).toHaveLength(8);
      expect(types).toContain(ResourceType.VIDEO);
      expect(types).toContain(ResourceType.ARTICLE);
      expect(types).toContain(ResourceType.PDF);
      expect(types).toContain(ResourceType.DOCUMENT);
      expect(types).toContain(ResourceType.IMAGE);
      expect(types).toContain(ResourceType.AUDIO);
      expect(types).toContain(ResourceType.LINK);
      expect(types).toContain(ResourceType.OTHER);
    });
  });

  describe('isValidType', () => {
    it('should return true for valid types', () => {
      const validTypes = [
        'video',
        'article',
        'pdf',
        'document',
        'image',
        'audio',
        'link',
        'other',
      ];
      validTypes.forEach((type) => {
        expect(ResourceTypeUtils.isValidType(type)).toBe(true);
      });
    });

    it('should return false for invalid types', () => {
      const invalidTypes = ['invalid', 'Video', 'ARTICLE', '', 'text', 'file'];
      invalidTypes.forEach((type) => {
        expect(ResourceTypeUtils.isValidType(type)).toBe(false);
      });
    });
  });

  describe('getDisplayName', () => {
    it('should return correct display names', () => {
      expect(ResourceTypeUtils.getDisplayName(ResourceType.VIDEO)).toBe(
        'Video'
      );
      expect(ResourceTypeUtils.getDisplayName(ResourceType.ARTICLE)).toBe(
        'Article'
      );
      expect(ResourceTypeUtils.getDisplayName(ResourceType.PDF)).toBe(
        'PDF Document'
      );
      expect(ResourceTypeUtils.getDisplayName(ResourceType.DOCUMENT)).toBe(
        'Document'
      );
      expect(ResourceTypeUtils.getDisplayName(ResourceType.IMAGE)).toBe(
        'Image'
      );
      expect(ResourceTypeUtils.getDisplayName(ResourceType.AUDIO)).toBe(
        'Audio'
      );
      expect(ResourceTypeUtils.getDisplayName(ResourceType.LINK)).toBe(
        'Web Link'
      );
      expect(ResourceTypeUtils.getDisplayName(ResourceType.OTHER)).toBe(
        'Other'
      );
    });
  });

  describe('getCommonExtensions', () => {
    it('should return correct extensions for each type', () => {
      expect(
        ResourceTypeUtils.getCommonExtensions(ResourceType.VIDEO)
      ).toContain('.mp4');
      expect(
        ResourceTypeUtils.getCommonExtensions(ResourceType.ARTICLE)
      ).toContain('.html');
      expect(ResourceTypeUtils.getCommonExtensions(ResourceType.PDF)).toContain(
        '.pdf'
      );
      expect(
        ResourceTypeUtils.getCommonExtensions(ResourceType.DOCUMENT)
      ).toContain('.doc');
      expect(
        ResourceTypeUtils.getCommonExtensions(ResourceType.IMAGE)
      ).toContain('.jpg');
      expect(
        ResourceTypeUtils.getCommonExtensions(ResourceType.AUDIO)
      ).toContain('.mp3');
      expect(ResourceTypeUtils.getCommonExtensions(ResourceType.LINK)).toEqual(
        []
      );
      expect(ResourceTypeUtils.getCommonExtensions(ResourceType.OTHER)).toEqual(
        []
      );
    });
  });

  describe('suggestTypeFromUrl', () => {
    it('should suggest VIDEO for video platforms', () => {
      const videoUrls = [
        'https://youtube.com/watch?v=123',
        'https://youtu.be/123',
        'https://vimeo.com/123',
        'https://twitch.tv/user',
      ];

      videoUrls.forEach((url) => {
        expect(ResourceTypeUtils.suggestTypeFromUrl(url)).toBe(
          ResourceType.VIDEO
        );
      });
    });

    it('should suggest ARTICLE for blog platforms', () => {
      const articleUrls = [
        'https://medium.com/article',
        'https://example.com/blog/post',
        'https://news.example.com/article',
      ];

      articleUrls.forEach((url) => {
        expect(ResourceTypeUtils.suggestTypeFromUrl(url)).toBe(
          ResourceType.ARTICLE
        );
      });
    });

    it('should suggest type based on file extension', () => {
      expect(
        ResourceTypeUtils.suggestTypeFromUrl('https://example.com/file.pdf')
      ).toBe(ResourceType.PDF);
      expect(
        ResourceTypeUtils.suggestTypeFromUrl('https://example.com/image.jpg')
      ).toBe(ResourceType.IMAGE);
      expect(
        ResourceTypeUtils.suggestTypeFromUrl('https://example.com/audio.mp3')
      ).toBe(ResourceType.AUDIO);
      expect(
        ResourceTypeUtils.suggestTypeFromUrl('https://example.com/doc.docx')
      ).toBe(ResourceType.DOCUMENT);
    });

    it('should suggest LINK for URLs without specific indicators', () => {
      expect(ResourceTypeUtils.suggestTypeFromUrl('https://example.com')).toBe(
        ResourceType.LINK
      );
      expect(
        ResourceTypeUtils.suggestTypeFromUrl('https://example.com/page')
      ).toBe(ResourceType.LINK);
    });

    it('should suggest OTHER for non-URLs', () => {
      expect(ResourceTypeUtils.suggestTypeFromUrl('local-file.txt')).toBe(
        ResourceType.ARTICLE // .txt is article extension
      );
      expect(ResourceTypeUtils.suggestTypeFromUrl('some-identifier')).toBe(
        ResourceType.OTHER
      );
    });
  });
});
