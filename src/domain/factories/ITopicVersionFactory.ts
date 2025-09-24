import { Topic } from '../entities/Topic';

/**
 * Interface for Topic Version Factory implementing Factory pattern
 * Responsible for creating new versions of topics with proper version control
 */
export interface ITopicVersionFactory {
  /**
   * Creates a new version of an existing topic with updated data
   * @param existingTopic The current topic to create a new version from
   * @param updates Partial updates to apply to the new version
   * @returns New Topic instance with incremented version and updated timestamp
   */
  createNewVersion(
    existingTopic: Topic,
    updates: Partial<Omit<Topic, 'id' | 'version' | 'createdAt' | 'updatedAt'>>
  ): Topic;

  /**
   * Creates a new version with only content updates
   * @param existingTopic The current topic to create a new version from
   * @param newContent The new content for the topic
   * @returns New Topic instance with updated content and incremented version
   */
  createContentVersion(existingTopic: Topic, newContent: string): Topic;

  /**
   * Creates a new version with only name updates
   * @param existingTopic The current topic to create a new version from
   * @param newName The new name for the topic
   * @returns New Topic instance with updated name and incremented version
   */
  createNameVersion(existingTopic: Topic, newName: string): Topic;

  /**
   * Creates a new version with parent relationship changes
   * @param existingTopic The current topic to create a new version from
   * @param newParentId The new parent topic ID (undefined to make it a root topic)
   * @returns New Topic instance with updated parent and incremented version
   */
  createParentVersion(existingTopic: Topic, newParentId?: string): Topic;
}
