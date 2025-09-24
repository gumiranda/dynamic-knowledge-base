/**
 * Enumeration of resource types supported by the system
 */
export enum ResourceType {
  VIDEO = 'video',
  ARTICLE = 'article',
  PDF = 'pdf',
  DOCUMENT = 'document',
  IMAGE = 'image',
  AUDIO = 'audio',
  LINK = 'link',
  OTHER = 'other',
}

/**
 * Utility functions for ResourceType enum
 */
export class ResourceTypeUtils {
  /**
   * Gets all available resource types
   * @returns Array of all ResourceType values
   */
  static getAllTypes(): ResourceType[] {
    return Object.values(ResourceType);
  }

  /**
   * Checks if a string is a valid resource type
   * @param type The type string to validate
   * @returns True if the type is valid
   */
  static isValidType(type: string): type is ResourceType {
    return Object.values(ResourceType).includes(type as ResourceType);
  }

  /**
   * Gets the display name for a resource type
   * @param type The resource type
   * @returns Human-readable display name
   */
  static getDisplayName(type: ResourceType): string {
    switch (type) {
      case ResourceType.VIDEO:
        return 'Video';
      case ResourceType.ARTICLE:
        return 'Article';
      case ResourceType.PDF:
        return 'PDF Document';
      case ResourceType.DOCUMENT:
        return 'Document';
      case ResourceType.IMAGE:
        return 'Image';
      case ResourceType.AUDIO:
        return 'Audio';
      case ResourceType.LINK:
        return 'Web Link';
      case ResourceType.OTHER:
        return 'Other';
      default:
        return 'Unknown';
    }
  }

  /**
   * Gets the file extensions typically associated with a resource type
   * @param type The resource type
   * @returns Array of common file extensions
   */
  static getCommonExtensions(type: ResourceType): string[] {
    switch (type) {
      case ResourceType.VIDEO:
        return ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
      case ResourceType.ARTICLE:
        return ['.html', '.htm', '.md', '.txt'];
      case ResourceType.PDF:
        return ['.pdf'];
      case ResourceType.DOCUMENT:
        return ['.doc', '.docx', '.odt', '.rtf', '.txt'];
      case ResourceType.IMAGE:
        return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'];
      case ResourceType.AUDIO:
        return ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma'];
      case ResourceType.LINK:
        return []; // URLs don't have extensions
      case ResourceType.OTHER:
        return [];
      default:
        return [];
    }
  }

  /**
   * Suggests a resource type based on URL or file extension
   * @param url The URL or filename to analyze
   * @returns Suggested ResourceType
   */
  static suggestTypeFromUrl(url: string): ResourceType {
    const lowerUrl = url.toLowerCase();

    // Check for common video platforms
    if (
      lowerUrl.includes('youtube.com') ||
      lowerUrl.includes('youtu.be') ||
      lowerUrl.includes('vimeo.com') ||
      lowerUrl.includes('twitch.tv')
    ) {
      return ResourceType.VIDEO;
    }

    // Check for common article/blog platforms
    if (
      lowerUrl.includes('medium.com') ||
      lowerUrl.includes('blog') ||
      lowerUrl.includes('article') ||
      lowerUrl.includes('news')
    ) {
      return ResourceType.ARTICLE;
    }

    // Check file extension
    const extension = this.getFileExtension(url);
    if (extension) {
      for (const type of this.getAllTypes()) {
        if (this.getCommonExtensions(type).includes(extension)) {
          return type;
        }
      }
    }

    // Default to link for URLs, other for everything else
    return this.isUrl(url) ? ResourceType.LINK : ResourceType.OTHER;
  }

  /**
   * Extracts file extension from URL or filename
   * @param url The URL or filename
   * @returns File extension with dot, or null if none found
   */
  private static getFileExtension(url: string): string | null {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? `.${match[1].toLowerCase()}` : null;
  }

  /**
   * Checks if a string appears to be a URL
   * @param str The string to check
   * @returns True if it looks like a URL
   */
  private static isUrl(str: string): boolean {
    return /^https?:\/\//i.test(str);
  }
}
