import { IRepository } from './IRepository';
import { Resource } from '../entities/Resource';
import { ResourceType } from '../enums/ResourceType';

/**
 * Repository interface for Resource entities with topic association support
 */
export interface IResourceRepository extends IRepository<Resource> {
  /**
   * Finds all resources associated with a specific topic
   * @param topicId The topic ID
   * @returns Promise resolving to array of resources for the topic
   */
  findByTopicId(topicId: string): Promise<Resource[]>;

  /**
   * Finds resources by type
   * @param type The resource type
   * @returns Promise resolving to array of resources of the specified type
   */
  findByType(type: ResourceType): Promise<Resource[]>;

  /**
   * Finds resources by URL (exact match)
   * @param url The resource URL
   * @returns Promise resolving to array of resources with matching URL
   */
  findByUrl(url: string): Promise<Resource[]>;

  /**
   * Finds resources containing specific text in description (case-insensitive)
   * @param description The description text to search for
   * @returns Promise resolving to array of matching resources
   */
  findByDescription(description: string): Promise<Resource[]>;

  /**
   * Finds resources associated with multiple topics
   * @param topicIds Array of topic IDs
   * @returns Promise resolving to array of resources for the specified topics
   */
  findByTopicIds(topicIds: string[]): Promise<Resource[]>;

  /**
   * Counts the number of resources for a specific topic
   * @param topicId The topic ID
   * @returns Promise resolving to the count of resources
   */
  countByTopicId(topicId: string): Promise<number>;

  /**
   * Counts the number of resources by type
   * @param type The resource type
   * @returns Promise resolving to the count of resources of that type
   */
  countByType(type: ResourceType): Promise<number>;

  /**
   * Checks if a resource with the given URL already exists for a topic
   * @param topicId The topic ID
   * @param url The resource URL
   * @returns Promise resolving to true if resource exists
   */
  existsByTopicAndUrl(topicId: string, url: string): Promise<boolean>;

  /**
   * Finds resources created within a date range
   * @param startDate The start date
   * @param endDate The end date
   * @returns Promise resolving to array of resources created in the date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<Resource[]>;

  /**
   * Finds the most recently created resources
   * @param limit The maximum number of resources to return
   * @returns Promise resolving to array of most recent resources
   */
  findMostRecent(limit: number): Promise<Resource[]>;

  /**
   * Deletes all resources associated with a topic
   * @param topicId The topic ID
   * @returns Promise resolving to the number of resources deleted
   */
  deleteByTopicId(topicId: string): Promise<number>;

  /**
   * Updates the topic ID for all resources (bulk operation for topic merging)
   * @param oldTopicId The old topic ID
   * @param newTopicId The new topic ID
   * @returns Promise resolving to the number of resources updated
   */
  updateTopicId(oldTopicId: string, newTopicId: string): Promise<number>;
}
