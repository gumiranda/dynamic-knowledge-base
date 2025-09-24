import { BaseEntity } from './BaseEntity';
import { ResourceType, ResourceTypeUtils } from '../enums/ResourceType';
import { EntityUtils } from '../utils/EntityUtils';

/**
 * Resource entity representing external resources associated with topics
 */
export class Resource extends BaseEntity {
  id: string;
  topicId: string;
  url: string;
  description: string;
  type: ResourceType;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    topicId: string;
    url: string;
    description: string;
    type: ResourceType;
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super();

    this.id = data.id || EntityUtils.generateId();
    this.topicId = data.topicId;
    this.url = data.url;
    this.description = data.description;
    this.type = data.type;
    this.createdAt = data.createdAt || EntityUtils.createTimestamp();
    this.updatedAt = data.updatedAt || EntityUtils.createTimestamp();
  }

  /**
   * Validates the resource entity
   * @returns True if resource is valid, false otherwise
   */
  isValid(): boolean {
    return (
      super.isValid() &&
      this.isValidTopicId() &&
      this.isValidUrl() &&
      this.isValidDescription() &&
      this.isValidType()
    );
  }

  /**
   * Validates the topic ID
   * @returns True if topic ID is valid
   */
  isValidTopicId(): boolean {
    return (
      typeof this.topicId === 'string' && EntityUtils.isNonEmptyId(this.topicId)
    );
  }

  /**
   * Validates the resource URL
   * @returns True if URL is valid
   */
  isValidUrl(): boolean {
    if (typeof this.url !== 'string' || this.url.trim().length === 0) {
      return false;
    }

    const trimmedUrl = this.url.trim();

    // Check length constraints
    if (trimmedUrl.length > 2048) {
      return false;
    }

    // Basic URL format validation
    try {
      // Allow both absolute URLs and relative paths
      if (
        trimmedUrl.startsWith('http://') ||
        trimmedUrl.startsWith('https://')
      ) {
        new URL(trimmedUrl);
        return true;
      } else if (
        trimmedUrl.startsWith('/') ||
        trimmedUrl.startsWith('./') ||
        trimmedUrl.startsWith('../')
      ) {
        // Relative paths are valid
        return true;
      } else {
        // Try to parse as URL with dummy protocol
        new URL(`https://${trimmedUrl}`);
        return true;
      }
    } catch {
      return false;
    }
  }

  /**
   * Validates the resource description
   * @returns True if description is valid
   */
  isValidDescription(): boolean {
    return (
      typeof this.description === 'string' && this.description.length <= 1000 // Max 1000 characters
    );
  }

  /**
   * Validates the resource type
   * @returns True if type is valid
   */
  isValidType(): boolean {
    return ResourceTypeUtils.isValidType(this.type);
  }

  /**
   * Updates the resource URL
   * @param newUrl The new URL
   */
  updateUrl(newUrl: string): void {
    if (!newUrl || typeof newUrl !== 'string') {
      throw new Error('Invalid URL provided');
    }

    const trimmedUrl = newUrl.trim();
    if (trimmedUrl.length === 0) {
      throw new Error('URL cannot be empty');
    }

    if (trimmedUrl.length > 2048) {
      throw new Error('URL cannot exceed 2048 characters');
    }

    // Validate URL format
    const tempResource = new Resource({
      topicId: this.topicId,
      url: trimmedUrl,
      description: this.description,
      type: this.type,
    });

    if (!tempResource.isValidUrl()) {
      throw new Error('Invalid URL format');
    }

    this.url = trimmedUrl;
    this.updateTimestamp();
  }

  /**
   * Updates the resource description
   * @param newDescription The new description
   */
  updateDescription(newDescription: string): void {
    if (typeof newDescription !== 'string') {
      throw new Error('Invalid description provided');
    }

    if (newDescription.length > 1000) {
      throw new Error('Description cannot exceed 1000 characters');
    }

    this.description = newDescription;
    this.updateTimestamp();
  }

  /**
   * Updates the resource type
   * @param newType The new resource type
   */
  updateType(newType: ResourceType): void {
    if (!ResourceTypeUtils.isValidType(newType)) {
      throw new Error('Invalid resource type provided');
    }

    this.type = newType;
    this.updateTimestamp();
  }

  /**
   * Updates the topic ID (moves resource to different topic)
   * @param newTopicId The new topic ID
   */
  updateTopicId(newTopicId: string): void {
    if (!newTopicId || typeof newTopicId !== 'string') {
      throw new Error('Invalid topic ID provided');
    }

    if (!EntityUtils.isNonEmptyId(newTopicId)) {
      throw new Error('Topic ID cannot be empty');
    }

    this.topicId = newTopicId;
    this.updateTimestamp();
  }

  /**
   * Gets the display name for the resource type
   * @returns Human-readable type name
   */
  getTypeDisplayName(): string {
    return ResourceTypeUtils.getDisplayName(this.type);
  }

  /**
   * Checks if the resource URL is an absolute URL
   * @returns True if URL is absolute (starts with http/https)
   */
  isAbsoluteUrl(): boolean {
    return this.url.startsWith('http://') || this.url.startsWith('https://');
  }

  /**
   * Checks if the resource URL is a relative path
   * @returns True if URL is relative
   */
  isRelativeUrl(): boolean {
    return !this.isAbsoluteUrl();
  }

  /**
   * Gets the domain from the URL (for absolute URLs)
   * @returns Domain name or null for relative URLs
   */
  getDomain(): string | null {
    if (!this.isAbsoluteUrl()) {
      return null;
    }

    try {
      const url = new URL(this.url);
      return url.hostname;
    } catch {
      return null;
    }
  }

  /**
   * Checks if the resource is from a trusted domain
   * @param trustedDomains Array of trusted domain names
   * @returns True if resource is from a trusted domain
   */
  isFromTrustedDomain(trustedDomains: string[]): boolean {
    const domain = this.getDomain();
    if (!domain) {
      return false; // Relative URLs are not considered trusted by default
    }

    return trustedDomains.some(
      (trusted) => domain === trusted || domain.endsWith(`.${trusted}`)
    );
  }

  /**
   * Suggests a better resource type based on the URL
   * @returns Suggested ResourceType
   */
  suggestBetterType(): ResourceType {
    return ResourceTypeUtils.suggestTypeFromUrl(this.url);
  }

  /**
   * Checks if the current type matches the suggested type from URL
   * @returns True if type seems appropriate for the URL
   */
  hasAppropriateType(): boolean {
    return this.type === this.suggestBetterType();
  }

  /**
   * Gets a short version of the URL for display purposes
   * @param maxLength Maximum length of the shortened URL
   * @returns Shortened URL
   */
  getShortUrl(maxLength: number = 50): string {
    if (this.url.length <= maxLength) {
      return this.url;
    }

    if (this.isAbsoluteUrl()) {
      try {
        const url = new URL(this.url);
        const domain = url.hostname;
        const path = url.pathname + url.search;

        if (domain.length + 3 >= maxLength) {
          return `${domain.substring(0, maxLength - 3)}...`;
        }

        const remainingLength = maxLength - domain.length - 3;
        return `${domain}${path.substring(0, remainingLength)}...`;
      } catch {
        return `${this.url.substring(0, maxLength - 3)}...`;
      }
    }

    return `${this.url.substring(0, maxLength - 3)}...`;
  }

  /**
   * Creates a safe representation of the resource for serialization
   * @returns Resource object without sensitive methods
   */
  toSafeObject(): Omit<Resource, 'updateTimestamp'> {
    return {
      id: this.id,
      topicId: this.topicId,
      url: this.url,
      description: this.description,
      type: this.type,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isValid: this.isValid.bind(this),
      isValidTopicId: this.isValidTopicId.bind(this),
      isValidUrl: this.isValidUrl.bind(this),
      isValidDescription: this.isValidDescription.bind(this),
      isValidType: this.isValidType.bind(this),
      updateUrl: this.updateUrl.bind(this),
      updateDescription: this.updateDescription.bind(this),
      updateType: this.updateType.bind(this),
      updateTopicId: this.updateTopicId.bind(this),
      getTypeDisplayName: this.getTypeDisplayName.bind(this),
      isAbsoluteUrl: this.isAbsoluteUrl.bind(this),
      isRelativeUrl: this.isRelativeUrl.bind(this),
      getDomain: this.getDomain.bind(this),
      isFromTrustedDomain: this.isFromTrustedDomain.bind(this),
      suggestBetterType: this.suggestBetterType.bind(this),
      hasAppropriateType: this.hasAppropriateType.bind(this),
      getShortUrl: this.getShortUrl.bind(this),
      toSafeObject: this.toSafeObject.bind(this),
    };
  }
}
