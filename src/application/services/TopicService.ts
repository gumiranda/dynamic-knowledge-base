import { Topic } from '../../domain/entities/Topic';
import { User } from '../../domain/entities/User';
import { ITopicRepository } from '../../domain/repositories/ITopicRepository';
import { ITopicVersionFactory } from '../../domain/factories/ITopicVersionFactory';
import { PermissionContext } from '../../domain/strategies/PermissionContext';
import {
  CreateTopicDto,
  UpdateTopicDto,
  TopicResponseDto,
  TopicHierarchyDto,
  TopicVersionDto,
  TopicSearchDto,
} from '../dtos/TopicDto';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '../errors/AppError';

/**
 * Service class for Topic business logic and operations
 * Implements CRUD operations with permission validation and version control
 */
export class TopicService {
  constructor(
    private readonly topicRepository: ITopicRepository,
    private readonly versionFactory: ITopicVersionFactory
  ) {}

  /**
   * Creates a new topic with permission validation
   * @param topicData The topic data to create
   * @param user The user creating the topic
   * @returns Promise resolving to the created topic
   */
  async createTopic(
    topicData: CreateTopicDto,
    user: User
  ): Promise<TopicResponseDto> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canWrite(user)) {
      throw new UnauthorizedError('Insufficient permissions to create topics');
    }

    // Validate input data
    this.validateCreateTopicData(topicData);

    // Validate parent topic exists if specified
    if (topicData.parentTopicId) {
      const parentTopic = await this.topicRepository.findLatestVersion(
        topicData.parentTopicId
      );
      if (!parentTopic) {
        throw new ValidationError(
          `Parent topic with ID ${topicData.parentTopicId} not found`
        );
      }

      // Check if parent is soft-deleted
      if (await this.topicRepository.isDeleted(topicData.parentTopicId)) {
        throw new ValidationError('Cannot create topic under deleted parent');
      }
    }

    // Create topic entity
    const topic = new Topic({
      name: topicData.name.trim(),
      content: topicData.content,
      parentTopicId: topicData.parentTopicId,
    });

    // Validate topic entity
    if (!topic.isValid()) {
      throw new ValidationError('Invalid topic data provided');
    }

    // Save to repository
    const createdTopic = await this.topicRepository.create(topic);

    return this.mapToResponseDto(createdTopic);
  }

  /**
   * Updates an existing topic with version control using Factory pattern
   * @param id The topic ID to update
   * @param updates The updates to apply
   * @param user The user performing the update
   * @returns Promise resolving to the updated topic
   */
  async updateTopic(
    id: string,
    updates: UpdateTopicDto,
    user: User
  ): Promise<TopicResponseDto> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canWrite(user)) {
      throw new UnauthorizedError('Insufficient permissions to update topics');
    }

    // Find existing topic
    const existingTopic = await this.topicRepository.findLatestVersion(id);
    if (!existingTopic) {
      throw new NotFoundError(`Topic with ID ${id} not found`);
    }

    // Check if topic is soft-deleted
    if (await this.topicRepository.isDeleted(id)) {
      throw new ConflictError('Cannot update deleted topic');
    }

    // Validate update data
    this.validateUpdateTopicData(updates);

    // Validate parent topic if being updated
    if (updates.parentTopicId !== undefined) {
      if (updates.parentTopicId) {
        const parentTopic = await this.topicRepository.findLatestVersion(
          updates.parentTopicId
        );
        if (!parentTopic) {
          throw new ValidationError(
            `Parent topic with ID ${updates.parentTopicId} not found`
          );
        }

        // Prevent circular references
        if (updates.parentTopicId === id) {
          throw new ValidationError('Topic cannot be its own parent');
        }

        // Check if parent is soft-deleted
        if (await this.topicRepository.isDeleted(updates.parentTopicId)) {
          throw new ValidationError('Cannot set deleted topic as parent');
        }

        // Check for circular reference in hierarchy
        await this.validateNoCircularReference(id, updates.parentTopicId);
      }
    }

    // Create new version using Factory pattern
    const newVersion = this.versionFactory.createNewVersion(
      existingTopic,
      updates
    );

    // Validate new version
    if (!newVersion.isValid()) {
      throw new ValidationError('Invalid updated topic data');
    }

    // Save new version
    const updatedTopic = await this.topicRepository.create(newVersion);

    return this.mapToResponseDto(updatedTopic);
  }

  /**
   * Retrieves a topic with version support
   * @param id The topic ID
   * @param version Optional specific version number
   * @param user The user requesting the topic
   * @returns Promise resolving to the topic or null if not found
   */
  async getTopic(
    id: string,
    version?: number,
    user?: User
  ): Promise<TopicResponseDto | null> {
    // Validate permissions if user provided
    if (user) {
      const permissionContext = new PermissionContext(user);
      if (!permissionContext.canRead(user)) {
        throw new UnauthorizedError('Insufficient permissions to read topics');
      }
    }

    let topic: Topic | null;

    if (version !== undefined) {
      topic = await this.topicRepository.findByVersion(id, version);
    } else {
      topic = await this.topicRepository.findLatestVersion(id);
    }

    if (!topic) {
      return null;
    }

    // Don't return soft-deleted topics unless specifically requested
    if (await this.topicRepository.isDeleted(id)) {
      return null;
    }

    return this.mapToResponseDto(topic);
  }

  /**
   * Retrieves all versions of a topic
   * @param id The topic ID
   * @param user The user requesting the versions
   * @returns Promise resolving to array of topic versions
   */
  async getTopicVersions(id: string, user: User): Promise<TopicVersionDto[]> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canRead(user)) {
      throw new UnauthorizedError(
        'Insufficient permissions to read topic versions'
      );
    }

    // Check if topic exists
    if (!(await this.topicRepository.exists(id))) {
      throw new NotFoundError(`Topic with ID ${id} not found`);
    }

    const versions = await this.topicRepository.findAllVersions(id);
    return versions.map(this.mapToVersionDto);
  }

  /**
   * Soft deletes a topic
   * @param id The topic ID to delete
   * @param user The user performing the deletion
   * @returns Promise resolving to true if deletion was successful
   */
  async deleteTopic(id: string, user: User): Promise<boolean> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canDelete(user)) {
      throw new UnauthorizedError('Insufficient permissions to delete topics');
    }

    // Check if topic exists
    const topic = await this.topicRepository.findLatestVersion(id);
    if (!topic) {
      throw new NotFoundError(`Topic with ID ${id} not found`);
    }

    // Check if already deleted
    if (await this.topicRepository.isDeleted(id)) {
      throw new ConflictError('Topic is already deleted');
    }

    // Perform soft delete
    return await this.topicRepository.softDelete(id);
  }

  /**
   * Restores a soft-deleted topic
   * @param id The topic ID to restore
   * @param user The user performing the restoration
   * @returns Promise resolving to true if restoration was successful
   */
  async restoreTopic(id: string, user: User): Promise<boolean> {
    // Validate permissions (only admins can restore)
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canDelete(user)) {
      throw new UnauthorizedError('Insufficient permissions to restore topics');
    }

    // Check if topic exists
    if (!(await this.topicRepository.exists(id))) {
      throw new NotFoundError(`Topic with ID ${id} not found`);
    }

    // Check if topic is actually deleted
    if (!(await this.topicRepository.isDeleted(id))) {
      throw new ConflictError('Topic is not deleted');
    }

    // Restore topic
    return await this.topicRepository.restore(id);
  }

  /**
   * Searches topics by name or content
   * @param searchTerm The term to search for
   * @param user The user performing the search
   * @returns Promise resolving to search results
   */
  async searchTopics(searchTerm: string, user: User): Promise<TopicSearchDto> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canRead(user)) {
      throw new UnauthorizedError('Insufficient permissions to search topics');
    }

    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new ValidationError('Search term cannot be empty');
    }

    const trimmedTerm = searchTerm.trim();

    // Search by name and content
    const [nameResults, contentResults] = await Promise.all([
      this.topicRepository.findByName(trimmedTerm),
      this.topicRepository.findByContent(trimmedTerm),
    ]);

    // Combine and deduplicate results
    const allResults = [...nameResults, ...contentResults];
    const uniqueResults = allResults.filter(
      (topic, index, array) =>
        array.findIndex((t) => t.id === topic.id) === index
    );

    // Filter out soft-deleted topics
    const activeResults = [];
    for (const topic of uniqueResults) {
      if (!(await this.topicRepository.isDeleted(topic.id))) {
        activeResults.push(topic);
      }
    }

    return {
      topics: activeResults.map(this.mapToResponseDto),
      totalCount: activeResults.length,
      searchTerm: trimmedTerm,
    };
  }

  // Private helper methods

  /**
   * Validates create topic data
   */
  private validateCreateTopicData(data: CreateTopicDto): void {
    if (!data.name || typeof data.name !== 'string') {
      throw new ValidationError('Topic name is required');
    }

    if (data.name.trim().length === 0) {
      throw new ValidationError('Topic name cannot be empty');
    }

    if (data.name.trim().length > 200) {
      throw new ValidationError('Topic name cannot exceed 200 characters');
    }

    if (typeof data.content !== 'string') {
      throw new ValidationError('Topic content must be a string');
    }

    if (data.content.length > 10000) {
      throw new ValidationError(
        'Topic content cannot exceed 10,000 characters'
      );
    }

    if (data.parentTopicId !== undefined) {
      if (
        typeof data.parentTopicId !== 'string' ||
        data.parentTopicId.trim().length === 0
      ) {
        throw new ValidationError('Parent topic ID must be a non-empty string');
      }
    }
  }

  /**
   * Validates update topic data
   */
  private validateUpdateTopicData(data: UpdateTopicDto): void {
    if (data.name !== undefined) {
      if (typeof data.name !== 'string') {
        throw new ValidationError('Topic name must be a string');
      }

      if (data.name.trim().length === 0) {
        throw new ValidationError('Topic name cannot be empty');
      }

      if (data.name.trim().length > 200) {
        throw new ValidationError('Topic name cannot exceed 200 characters');
      }
    }

    if (data.content !== undefined) {
      if (typeof data.content !== 'string') {
        throw new ValidationError('Topic content must be a string');
      }

      if (data.content.length > 10000) {
        throw new ValidationError(
          'Topic content cannot exceed 10,000 characters'
        );
      }
    }

    if (data.parentTopicId !== undefined && data.parentTopicId !== null) {
      if (
        typeof data.parentTopicId !== 'string' ||
        data.parentTopicId.trim().length === 0
      ) {
        throw new ValidationError('Parent topic ID must be a non-empty string');
      }
    }
  }

  /**
   * Validates that setting a parent won't create circular reference
   */
  private async validateNoCircularReference(
    topicId: string,
    newParentId: string
  ): Promise<void> {
    // Check if the new parent is a descendant of the current topic
    const descendants = await this.getAllDescendantIds(topicId);
    if (descendants.includes(newParentId)) {
      throw new ValidationError(
        'Cannot set parent: would create circular reference'
      );
    }
  }

  /**
   * Gets all descendant IDs for a topic
   */
  private async getAllDescendantIds(topicId: string): Promise<string[]> {
    const descendants: string[] = [];
    const children = await this.topicRepository.findByParentId(topicId);

    for (const child of children) {
      descendants.push(child.id);
      const childDescendants = await this.getAllDescendantIds(child.id);
      descendants.push(...childDescendants);
    }

    return descendants;
  }

  /**
   * Maps Topic entity to response DTO
   */
  private mapToResponseDto(topic: Topic): TopicResponseDto {
    return {
      id: topic.id,
      name: topic.name,
      content: topic.content,
      version: topic.version,
      parentTopicId: topic.parentTopicId,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
      childCount: topic.getChildCount(),
      isRoot: topic.isRoot(),
      isLeaf: topic.isLeaf(),
    };
  }

  /**
   * Maps Topic entity to version DTO
   */
  private mapToVersionDto(topic: Topic): TopicVersionDto {
    return {
      id: topic.id,
      name: topic.name,
      content: topic.content,
      version: topic.version,
      parentTopicId: topic.parentTopicId,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
    };
  }
  // Hierarchical Operations

  /**
   * Retrieves topic hierarchy recursively from a starting topic
   * @param topicId The root topic ID for hierarchy retrieval
   * @param user The user requesting the hierarchy
   * @param maxDepth Optional maximum depth to prevent infinite recursion
   * @returns Promise resolving to the topic hierarchy
   */
  async getTopicHierarchy(
    topicId: string,
    user: User,
    maxDepth: number = 10
  ): Promise<TopicHierarchyDto> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canRead(user)) {
      throw new UnauthorizedError(
        'Insufficient permissions to read topic hierarchy'
      );
    }

    // Find root topic
    const rootTopic = await this.topicRepository.findLatestVersion(topicId);
    if (!rootTopic) {
      throw new NotFoundError(`Topic with ID ${topicId} not found`);
    }

    // Check if topic is soft-deleted
    if (await this.topicRepository.isDeleted(topicId)) {
      throw new NotFoundError('Topic is deleted');
    }

    return this.buildHierarchyRecursively(rootTopic, 0, maxDepth);
  }

  /**
   * Finds all root topics (topics without parents)
   * @param user The user requesting root topics
   * @returns Promise resolving to array of root topics
   */
  async getRootTopics(user: User): Promise<TopicResponseDto[]> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canRead(user)) {
      throw new UnauthorizedError('Insufficient permissions to read topics');
    }

    const rootTopics = await this.topicRepository.findRootTopics();

    // Filter out soft-deleted topics
    const activeRootTopics = [];
    for (const topic of rootTopics) {
      if (!(await this.topicRepository.isDeleted(topic.id))) {
        activeRootTopics.push(topic);
      }
    }

    return activeRootTopics.map(this.mapToResponseDto);
  }

  /**
   * Finds orphaned topics (topics whose parent no longer exists)
   * @param user The user requesting orphaned topics
   * @returns Promise resolving to array of orphaned topics
   */
  async getOrphanedTopics(user: User): Promise<TopicResponseDto[]> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canRead(user)) {
      throw new UnauthorizedError('Insufficient permissions to read topics');
    }

    const allTopics = await this.topicRepository.findAll();
    const orphanedTopics: Topic[] = [];

    for (const topic of allTopics) {
      // Skip if topic is soft-deleted
      if (await this.topicRepository.isDeleted(topic.id)) {
        continue;
      }

      // Skip root topics (they're not orphaned)
      if (!topic.parentTopicId) {
        continue;
      }

      // Check if parent exists and is not deleted
      const parentExists = await this.topicRepository.exists(
        topic.parentTopicId
      );
      const parentDeleted = parentExists
        ? await this.topicRepository.isDeleted(topic.parentTopicId)
        : false;

      if (!parentExists || parentDeleted) {
        orphanedTopics.push(topic);
      }
    }

    return orphanedTopics.map(this.mapToResponseDto);
  }

  /**
   * Gets all child topics for a given parent topic
   * @param parentId The parent topic ID
   * @param user The user requesting child topics
   * @returns Promise resolving to array of child topics
   */
  async getChildTopics(
    parentId: string,
    user: User
  ): Promise<TopicResponseDto[]> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canRead(user)) {
      throw new UnauthorizedError('Insufficient permissions to read topics');
    }

    // Verify parent topic exists
    const parentTopic = await this.topicRepository.findLatestVersion(parentId);
    if (!parentTopic) {
      throw new NotFoundError(`Parent topic with ID ${parentId} not found`);
    }

    // Check if parent is soft-deleted
    if (await this.topicRepository.isDeleted(parentId)) {
      throw new NotFoundError('Parent topic is deleted');
    }

    const childTopics = await this.topicRepository.findByParentId(parentId);

    // Filter out soft-deleted child topics
    const activeChildTopics = [];
    for (const topic of childTopics) {
      if (!(await this.topicRepository.isDeleted(topic.id))) {
        activeChildTopics.push(topic);
      }
    }

    return activeChildTopics.map(this.mapToResponseDto);
  }

  /**
   * Validates parent-child relationship constraints
   * @param childId The child topic ID
   * @param parentId The parent topic ID
   * @param user The user performing the validation
   * @returns Promise resolving to validation result
   */
  async validateParentChildRelationship(
    childId: string,
    parentId: string,
    user: User
  ): Promise<{ isValid: boolean; reason?: string }> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canRead(user)) {
      throw new UnauthorizedError(
        'Insufficient permissions to validate relationships'
      );
    }

    // Check if both topics exist
    const [childTopic, parentTopic] = await Promise.all([
      this.topicRepository.findLatestVersion(childId),
      this.topicRepository.findLatestVersion(parentId),
    ]);

    if (!childTopic) {
      return { isValid: false, reason: 'Child topic not found' };
    }

    if (!parentTopic) {
      return { isValid: false, reason: 'Parent topic not found' };
    }

    // Check if either topic is soft-deleted
    const [childDeleted, parentDeleted] = await Promise.all([
      this.topicRepository.isDeleted(childId),
      this.topicRepository.isDeleted(parentId),
    ]);

    if (childDeleted) {
      return { isValid: false, reason: 'Child topic is deleted' };
    }

    if (parentDeleted) {
      return { isValid: false, reason: 'Parent topic is deleted' };
    }

    // Check for self-reference
    if (childId === parentId) {
      return { isValid: false, reason: 'Topic cannot be its own parent' };
    }

    // Check for circular reference
    try {
      await this.validateNoCircularReference(childId, parentId);
    } catch (error) {
      return { isValid: false, reason: 'Would create circular reference' };
    }

    return { isValid: true };
  }

  /**
   * Builds topic hierarchy recursively
   * @param topic The root topic
   * @param currentDepth Current recursion depth
   * @param maxDepth Maximum allowed depth
   * @returns Promise resolving to topic hierarchy
   */
  private async buildHierarchyRecursively(
    topic: Topic,
    currentDepth: number,
    maxDepth: number
  ): Promise<TopicHierarchyDto> {
    if (currentDepth >= maxDepth) {
      // Return topic without children if max depth reached
      return {
        topic: this.mapToResponseDto(topic),
        children: [],
        depth: currentDepth,
      };
    }

    // Get child topics
    const childTopics = await this.topicRepository.findByParentId(topic.id);

    // Filter out soft-deleted children and build their hierarchies
    const childHierarchies: TopicHierarchyDto[] = [];
    for (const child of childTopics) {
      if (!(await this.topicRepository.isDeleted(child.id))) {
        const childHierarchy = await this.buildHierarchyRecursively(
          child,
          currentDepth + 1,
          maxDepth
        );
        childHierarchies.push(childHierarchy);
      }
    }

    return {
      topic: this.mapToResponseDto(topic),
      children: childHierarchies,
      depth: currentDepth,
    };
  }
}
