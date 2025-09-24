import { IRepository } from './IRepository';
import { Topic } from '../entities/Topic';

/**
 * Repository interface for Topic entities with version control support
 */
export interface ITopicRepository extends IRepository<Topic> {
  /**
   * Finds a specific version of a topic
   * @param id The topic ID
   * @param version The version number
   * @returns Promise resolving to the topic version or null if not found
   */
  findByVersion(id: string, version: number): Promise<Topic | null>;

  /**
   * Finds all versions of a topic
   * @param id The topic ID
   * @returns Promise resolving to array of all topic versions
   */
  findAllVersions(id: string): Promise<Topic[]>;

  /**
   * Finds all topics that have the specified parent ID
   * @param parentId The parent topic ID
   * @returns Promise resolving to array of child topics
   */
  findByParentId(parentId: string): Promise<Topic[]>;

  /**
   * Finds all root topics (topics without a parent)
   * @returns Promise resolving to array of root topics
   */
  findRootTopics(): Promise<Topic[]>;

  /**
   * Finds the latest version of a topic
   * @param id The topic ID
   * @returns Promise resolving to the latest topic version or null if not found
   */
  findLatestVersion(id: string): Promise<Topic | null>;

  /**
   * Gets the current version number for a topic
   * @param id The topic ID
   * @returns Promise resolving to the current version number or null if topic doesn't exist
   */
  getCurrentVersion(id: string): Promise<number | null>;

  /**
   * Checks if a topic exists (any version)
   * @param id The topic ID
   * @returns Promise resolving to true if topic exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Finds topics by name (case-insensitive search)
   * @param name The topic name to search for
   * @returns Promise resolving to array of matching topics
   */
  findByName(name: string): Promise<Topic[]>;

  /**
   * Finds topics containing specific content (case-insensitive search)
   * @param content The content to search for
   * @returns Promise resolving to array of matching topics
   */
  findByContent(content: string): Promise<Topic[]>;

  /**
   * Soft deletes a topic (marks as deleted but preserves data)
   * @param id The topic ID
   * @returns Promise resolving to true if deletion was successful
   */
  softDelete(id: string): Promise<boolean>;

  /**
   * Restores a soft-deleted topic
   * @param id The topic ID
   * @returns Promise resolving to true if restoration was successful
   */
  restore(id: string): Promise<boolean>;

  /**
   * Checks if a topic is soft-deleted
   * @param id The topic ID
   * @returns Promise resolving to true if topic is soft-deleted
   */
  isDeleted(id: string): Promise<boolean>;
}
