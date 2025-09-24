import { Resource } from '../../domain/entities/Resource';
import { User } from '../../domain/entities/User';
import { ResourceType } from '../../domain/enums/ResourceType';
import { IResourceRepository } from '../../domain/repositories/IResourceRepository';
import { ITopicRepository } from '../../domain/repositories/ITopicRepository';
import { PermissionContext } from '../../domain/strategies/PermissionContext';
import {
  CreateResourceDto,
  UpdateResourceDto,
  ResourceResponseDto,
  ResourceSearchDto,
  TopicResourcesDto,
} from '../dtos/ResourceDto';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '../errors/AppError';

/**
 * Service class for Resource business logic and operations
 * Implements CRUD operations with topic validation and permission checking
 */
export class ResourceService {
  constructor(
    private readonly resourceRepository: IResourceRepository,
    private readonly topicRepository: ITopicRepository
  ) {}

  /**
   * Creates a new resource with topic validation
   * @param resourceData The resource data to create
   * @param user The user creating the resource
   * @returns Promise resolving to the created resource
   */
  async createResource(
    resourceData: CreateResourceDto,
    user: User
  ): Promise<ResourceResponseDto> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canWrite(user)) {
      throw new UnauthorizedError(
        'Insufficient permissions to create resources'
      );
    }

    // Validate input data
    this.validateCreateResourceData(resourceData);

    // Validate topic exists and is not deleted
    await this.validateTopicExists(resourceData.topicId);

    // Check for duplicate URL in the same topic
    const existingResource = await this.resourceRepository.existsByTopicAndUrl(
      resourceData.topicId,
      resourceData.url.trim()
    );

    if (existingResource) {
      throw new ConflictError(
        'A resource with this URL already exists for this topic'
      );
    }

    // Create resource entity
    const resource = new Resource({
      topicId: resourceData.topicId,
      url: resourceData.url.trim(),
      description: resourceData.description.trim(),
      type: resourceData.type,
    });

    // Validate resource entity
    if (!resource.isValid()) {
      throw new ValidationError('Invalid resource data provided');
    }

    // Save to repository
    const createdResource = await this.resourceRepository.create(resource);

    return this.mapToResponseDto(createdResource);
  }

  /**
   * Updates an existing resource
   * @param id The resource ID to update
   * @param updates The updates to apply
   * @param user The user performing the update
   * @returns Promise resolving to the updated resource
   */
  async updateResource(
    id: string,
    updates: UpdateResourceDto,
    user: User
  ): Promise<ResourceResponseDto> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canWrite(user)) {
      throw new UnauthorizedError(
        'Insufficient permissions to update resources'
      );
    }

    // Find existing resource
    const existingResource = await this.resourceRepository.findById(id);
    if (!existingResource) {
      throw new NotFoundError(`Resource with ID ${id} not found`);
    }

    // Validate update data
    this.validateUpdateResourceData(updates);

    // Validate topic if being updated
    if (updates.topicId && updates.topicId !== existingResource.topicId) {
      await this.validateTopicExists(updates.topicId);
    }

    // Check for URL conflicts if URL or topic is being updated
    if (updates.url || updates.topicId) {
      const newUrl = updates.url?.trim() || existingResource.url;
      const newTopicId = updates.topicId || existingResource.topicId;

      // Only check for conflicts if URL or topic actually changed
      if (
        newUrl !== existingResource.url ||
        newTopicId !== existingResource.topicId
      ) {
        const existingWithUrl =
          await this.resourceRepository.existsByTopicAndUrl(newTopicId, newUrl);

        if (existingWithUrl) {
          throw new ConflictError(
            'A resource with this URL already exists for this topic'
          );
        }
      }
    }

    // Apply updates
    if (updates.url !== undefined) {
      existingResource.updateUrl(updates.url);
    }
    if (updates.description !== undefined) {
      existingResource.updateDescription(updates.description);
    }
    if (updates.type !== undefined) {
      existingResource.updateType(updates.type);
    }
    if (updates.topicId !== undefined) {
      existingResource.updateTopicId(updates.topicId);
    }

    // Validate updated resource
    if (!existingResource.isValid()) {
      throw new ValidationError('Invalid updated resource data');
    }

    // Save updates
    const updatedResource = await this.resourceRepository.update(
      id,
      existingResource
    );

    return this.mapToResponseDto(updatedResource);
  }

  /**
   * Retrieves a resource by ID
   * @param id The resource ID
   * @param user The user requesting the resource
   * @returns Promise resolving to the resource or null if not found
   */
  async getResource(
    id: string,
    user: User
  ): Promise<ResourceResponseDto | null> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canRead(user)) {
      throw new UnauthorizedError('Insufficient permissions to read resources');
    }

    const resource = await this.resourceRepository.findById(id);
    if (!resource) {
      return null;
    }

    return this.mapToResponseDto(resource);
  }

  /**
   * Retrieves all resources for a specific topic
   * @param topicId The topic ID
   * @param user The user requesting the resources
   * @returns Promise resolving to array of resources
   */
  async getResourcesByTopic(
    topicId: string,
    user: User
  ): Promise<ResourceResponseDto[]> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canRead(user)) {
      throw new UnauthorizedError('Insufficient permissions to read resources');
    }

    // Validate topic exists
    await this.validateTopicExists(topicId);

    const resources = await this.resourceRepository.findByTopicId(topicId);
    return resources.map(this.mapToResponseDto);
  }

  /**
   * Retrieves resources by type
   * @param type The resource type
   * @param user The user requesting the resources
   * @returns Promise resolving to array of resources
   */
  async getResourcesByType(
    type: ResourceType,
    user: User
  ): Promise<ResourceResponseDto[]> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canRead(user)) {
      throw new UnauthorizedError('Insufficient permissions to read resources');
    }

    const resources = await this.resourceRepository.findByType(type);
    return resources.map(this.mapToResponseDto);
  }

  /**
   * Deletes a resource
   * @param id The resource ID to delete
   * @param user The user performing the deletion
   * @returns Promise resolving to true if deletion was successful
   */
  async deleteResource(id: string, user: User): Promise<boolean> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canDelete(user)) {
      throw new UnauthorizedError(
        'Insufficient permissions to delete resources'
      );
    }

    // Check if resource exists
    const resource = await this.resourceRepository.findById(id);
    if (!resource) {
      throw new NotFoundError(`Resource with ID ${id} not found`);
    }

    // Perform deletion
    return await this.resourceRepository.delete(id);
  }

  /**
   * Searches resources by description
   * @param searchTerm The term to search for in descriptions
   * @param user The user performing the search
   * @param filterType Optional resource type filter
   * @returns Promise resolving to search results
   */
  async searchResources(
    searchTerm: string,
    user: User,
    filterType?: ResourceType
  ): Promise<ResourceSearchDto> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canRead(user)) {
      throw new UnauthorizedError(
        'Insufficient permissions to search resources'
      );
    }

    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new ValidationError('Search term cannot be empty');
    }

    const trimmedTerm = searchTerm.trim();

    // Search by description
    let resources =
      await this.resourceRepository.findByDescription(trimmedTerm);

    // Apply type filter if specified
    if (filterType) {
      resources = resources.filter((resource) => resource.type === filterType);
    }

    return {
      resources: resources.map(this.mapToResponseDto),
      totalCount: resources.length,
      searchTerm: trimmedTerm,
      filterType,
    };
  }

  /**
   * Gets resources grouped by topic with topic information
   * @param topicIds Array of topic IDs to get resources for
   * @param user The user requesting the resources
   * @returns Promise resolving to array of topic resources
   */
  async getResourcesGroupedByTopic(
    topicIds: string[],
    user: User
  ): Promise<TopicResourcesDto[]> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canRead(user)) {
      throw new UnauthorizedError('Insufficient permissions to read resources');
    }

    if (!topicIds || topicIds.length === 0) {
      return [];
    }

    // Get resources for all topics
    const resources = await this.resourceRepository.findByTopicIds(topicIds);

    // Group resources by topic
    const resourcesByTopic = new Map<string, Resource[]>();
    for (const resource of resources) {
      if (!resourcesByTopic.has(resource.topicId)) {
        resourcesByTopic.set(resource.topicId, []);
      }
      resourcesByTopic.get(resource.topicId)!.push(resource);
    }

    // Get topic information and build response
    const result: TopicResourcesDto[] = [];
    for (const topicId of topicIds) {
      const topic = await this.topicRepository.findLatestVersion(topicId);
      if (topic && !(await this.topicRepository.isDeleted(topicId))) {
        const topicResources = resourcesByTopic.get(topicId) || [];
        result.push({
          topicId,
          topicName: topic.name,
          resources: topicResources.map(this.mapToResponseDto),
          resourceCount: topicResources.length,
        });
      }
    }

    return result;
  }

  /**
   * Gets the most recently created resources
   * @param limit Maximum number of resources to return
   * @param user The user requesting the resources
   * @returns Promise resolving to array of recent resources
   */
  async getRecentResources(
    limit: number,
    user: User
  ): Promise<ResourceResponseDto[]> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canRead(user)) {
      throw new UnauthorizedError('Insufficient permissions to read resources');
    }

    if (limit <= 0 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    const resources = await this.resourceRepository.findMostRecent(limit);
    return resources.map(this.mapToResponseDto);
  }

  /**
   * Validates topic association and URL format
   * @param topicId The topic ID
   * @param url The resource URL
   * @param user The user performing the validation
   * @returns Promise resolving to validation result
   */
  async validateResourceAssociation(
    topicId: string,
    url: string,
    user: User
  ): Promise<{ isValid: boolean; reason?: string; suggestions?: string[] }> {
    // Validate permissions
    const permissionContext = new PermissionContext(user);
    if (!permissionContext.canRead(user)) {
      throw new UnauthorizedError(
        'Insufficient permissions to validate resources'
      );
    }

    const suggestions: string[] = [];

    // Check if topic exists
    try {
      await this.validateTopicExists(topicId);
    } catch (error) {
      return { isValid: false, reason: 'Topic not found or is deleted' };
    }

    // Validate URL format
    const tempResource = new Resource({
      topicId,
      url: url.trim(),
      description: '',
      type: ResourceType.OTHER,
    });

    if (!tempResource.isValidUrl()) {
      return { isValid: false, reason: 'Invalid URL format' };
    }

    // Check for existing resource with same URL
    const existingResource = await this.resourceRepository.existsByTopicAndUrl(
      topicId,
      url.trim()
    );

    if (existingResource) {
      return {
        isValid: false,
        reason: 'Resource with this URL already exists for this topic',
      };
    }

    // Suggest better resource type
    const suggestedType = tempResource.suggestBetterType();
    if (suggestedType !== ResourceType.OTHER) {
      suggestions.push(`Consider using resource type: ${suggestedType}`);
    }

    return { isValid: true, suggestions };
  }

  // Private helper methods

  /**
   * Validates create resource data
   */
  private validateCreateResourceData(data: CreateResourceDto): void {
    if (!data.topicId || typeof data.topicId !== 'string') {
      throw new ValidationError('Topic ID is required');
    }

    if (!data.url || typeof data.url !== 'string') {
      throw new ValidationError('Resource URL is required');
    }

    if (data.url.trim().length === 0) {
      throw new ValidationError('Resource URL cannot be empty');
    }

    if (data.url.trim().length > 2048) {
      throw new ValidationError('Resource URL cannot exceed 2048 characters');
    }

    if (typeof data.description !== 'string') {
      throw new ValidationError('Resource description must be a string');
    }

    if (data.description.length > 1000) {
      throw new ValidationError(
        'Resource description cannot exceed 1000 characters'
      );
    }

    if (!Object.values(ResourceType).includes(data.type)) {
      throw new ValidationError('Invalid resource type');
    }
  }

  /**
   * Validates update resource data
   */
  private validateUpdateResourceData(data: UpdateResourceDto): void {
    if (data.topicId !== undefined) {
      if (
        typeof data.topicId !== 'string' ||
        data.topicId.trim().length === 0
      ) {
        throw new ValidationError('Topic ID must be a non-empty string');
      }
    }

    if (data.url !== undefined) {
      if (typeof data.url !== 'string') {
        throw new ValidationError('Resource URL must be a string');
      }

      if (data.url.trim().length === 0) {
        throw new ValidationError('Resource URL cannot be empty');
      }

      if (data.url.trim().length > 2048) {
        throw new ValidationError('Resource URL cannot exceed 2048 characters');
      }
    }

    if (data.description !== undefined) {
      if (typeof data.description !== 'string') {
        throw new ValidationError('Resource description must be a string');
      }

      if (data.description.length > 1000) {
        throw new ValidationError(
          'Resource description cannot exceed 1000 characters'
        );
      }
    }

    if (data.type !== undefined) {
      if (!Object.values(ResourceType).includes(data.type)) {
        throw new ValidationError('Invalid resource type');
      }
    }
  }

  /**
   * Validates that a topic exists and is not deleted
   */
  private async validateTopicExists(topicId: string): Promise<void> {
    const topic = await this.topicRepository.findLatestVersion(topicId);
    if (!topic) {
      throw new ValidationError(`Topic with ID ${topicId} not found`);
    }

    if (await this.topicRepository.isDeleted(topicId)) {
      throw new ValidationError('Cannot associate resource with deleted topic');
    }
  }

  /**
   * Maps Resource entity to response DTO
   */
  private mapToResponseDto(resource: Resource): ResourceResponseDto {
    return {
      id: resource.id,
      topicId: resource.topicId,
      url: resource.url,
      description: resource.description,
      type: resource.type,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };
  }
}
