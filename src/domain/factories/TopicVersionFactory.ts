/* eslint-disable no-prototype-builtins */
import { Topic } from '../entities/Topic';
import { ITopicVersionFactory } from './ITopicVersionFactory';
import { EntityUtils } from '../utils/EntityUtils';

/**
 * Concrete implementation of Topic Version Factory using Factory pattern
 * Handles creation of new topic versions with proper version control and validation
 */
export class TopicVersionFactory implements ITopicVersionFactory {
  /**
   * Creates a new version of an existing topic with updated data
   * @param existingTopic The current topic to create a new version from
   * @param updates Partial updates to apply to the new version
   * @returns New Topic instance with incremented version and updated timestamp
   */
  createNewVersion(
    existingTopic: Topic,
    updates: Partial<Omit<Topic, 'id' | 'version' | 'createdAt' | 'updatedAt'>>
  ): Topic {
    this.validateExistingTopic(existingTopic);
    this.validateUpdates(updates);

    // Process updates with proper trimming and handling
    const processedName =
      updates.name !== undefined ? updates.name.trim() : existingTopic.name;

    const processedParentId = updates.hasOwnProperty('parentTopicId')
      ? updates.parentTopicId
      : existingTopic.parentTopicId;

    // Create new topic with incremented version
    const newTopic = new Topic({
      name: processedName,
      content: updates.content ?? existingTopic.content,
      parentTopicId: processedParentId,
      id: EntityUtils.generateId(), // Generate new ID for new version
      version: existingTopic.version + 1,
      createdAt: existingTopic.createdAt, // Preserve original creation date
      updatedAt: EntityUtils.createTimestamp(), // Update timestamp for new version
    });

    // Validate the new topic before returning
    if (!newTopic.isValid()) {
      throw new Error('Created topic version is invalid');
    }

    return newTopic;
  }

  /**
   * Creates a new version with only content updates
   * @param existingTopic The current topic to create a new version from
   * @param newContent The new content for the topic
   * @returns New Topic instance with updated content and incremented version
   */
  createContentVersion(existingTopic: Topic, newContent: string): Topic {
    this.validateContent(newContent);

    return this.createNewVersion(existingTopic, { content: newContent });
  }

  /**
   * Creates a new version with only name updates
   * @param existingTopic The current topic to create a new version from
   * @param newName The new name for the topic
   * @returns New Topic instance with updated name and incremented version
   */
  createNameVersion(existingTopic: Topic, newName: string): Topic {
    this.validateName(newName);

    return this.createNewVersion(existingTopic, { name: newName });
  }

  /**
   * Creates a new version with parent relationship changes
   * @param existingTopic The current topic to create a new version from
   * @param newParentId The new parent topic ID (undefined to make it a root topic)
   * @returns New Topic instance with updated parent and incremented version
   */
  createParentVersion(existingTopic: Topic, newParentId?: string): Topic {
    this.validateParentId(newParentId, existingTopic.id);

    return this.createNewVersion(existingTopic, { parentTopicId: newParentId });
  }

  /**
   * Validates the existing topic before creating a new version
   * @param existingTopic The topic to validate
   * @throws Error if topic is invalid
   */
  private validateExistingTopic(existingTopic: Topic): void {
    if (!existingTopic) {
      throw new Error('Existing topic cannot be null or undefined');
    }

    if (!existingTopic.isValid()) {
      throw new Error('Existing topic is invalid');
    }

    if (existingTopic.version < 1) {
      throw new Error('Existing topic must have a valid version number');
    }
  }

  /**
   * Validates the updates object
   * @param updates The updates to validate
   * @throws Error if updates are invalid
   */
  private validateUpdates(
    updates: Partial<Omit<Topic, 'id' | 'version' | 'createdAt' | 'updatedAt'>>
  ): void {
    if (!updates || typeof updates !== 'object') {
      throw new Error('Updates must be a valid object');
    }

    // Validate individual fields if they are provided
    if (updates.name !== undefined) {
      this.validateName(updates.name);
    }

    if (updates.content !== undefined) {
      this.validateContent(updates.content);
    }

    if (updates.parentTopicId !== undefined) {
      this.validateParentId(updates.parentTopicId);
    }
  }

  /**
   * Validates topic name
   * @param name The name to validate
   * @throws Error if name is invalid
   */
  private validateName(name: string): void {
    if (typeof name !== 'string') {
      throw new Error('Topic name must be a string');
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 1) {
      throw new Error('Topic name cannot be empty');
    }

    if (trimmedName.length > 200) {
      throw new Error('Topic name cannot exceed 200 characters');
    }
  }

  /**
   * Validates topic content
   * @param content The content to validate
   * @throws Error if content is invalid
   */
  private validateContent(content: string): void {
    if (typeof content !== 'string') {
      throw new Error('Topic content must be a string');
    }

    if (content.length > 10000) {
      throw new Error('Topic content cannot exceed 10,000 characters');
    }
  }

  /**
   * Validates parent topic ID
   * @param parentId The parent ID to validate
   * @param currentTopicId The current topic ID to prevent self-reference
   * @throws Error if parent ID is invalid
   */
  private validateParentId(parentId?: string, currentTopicId?: string): void {
    if (parentId !== undefined) {
      if (typeof parentId !== 'string' || !EntityUtils.isNonEmptyId(parentId)) {
        throw new Error('Parent topic ID must be a valid non-empty string');
      }

      if (currentTopicId && parentId === currentTopicId) {
        throw new Error('Topic cannot be its own parent');
      }
    }
  }
}
