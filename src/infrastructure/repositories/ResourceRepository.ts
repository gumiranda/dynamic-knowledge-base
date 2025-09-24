import { IResourceRepository } from '../../domain/repositories/IResourceRepository';
import { Resource } from '../../domain/entities/Resource';
import { ResourceType } from '../../domain/enums/ResourceType';
import { FileDatabase } from '../database/FileDatabase';

/**
 * File-based implementation of IResourceRepository with topic association support
 */
export class ResourceRepository implements IResourceRepository {
  constructor(private database: FileDatabase) {}

  /**
   * Finds a resource by ID
   */
  async findById(id: string): Promise<Resource | null> {
    const data = await this.database.getData();
    const resourceData = data.resources[id];

    if (!resourceData) {
      return null;
    }

    return this.deserializeResource(resourceData);
  }

  /**
   * Finds all resources
   */
  async findAll(): Promise<Resource[]> {
    const data = await this.database.getData();
    const resources: Resource[] = [];

    for (const resourceData of Object.values(data.resources)) {
      resources.push(this.deserializeResource(resourceData));
    }

    return resources.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  /**
   * Creates a new resource
   */
  async create(entity: Resource): Promise<Resource> {
    return await this.database.transaction(async (data) => {
      // Generate new ID if not provided
      if (!entity.id) {
        data.metadata.lastResourceId++;
        entity.id = `resource_${data.metadata.lastResourceId}`;
      }

      // Check if resource already exists
      if (data.resources[entity.id]) {
        throw new Error(`Resource with ID ${entity.id} already exists`);
      }

      // Validate entity
      if (!entity.isValid()) {
        throw new Error('Invalid resource data');
      }

      // Validate that topic exists
      if (
        !data.topics[entity.topicId] ||
        data.topics[entity.topicId].isDeleted
      ) {
        throw new Error(`Topic with ID ${entity.topicId} not found`);
      }

      // Store resource
      data.resources[entity.id] = this.serializeResource(entity);

      return entity;
    });
  }

  /**
   * Updates a resource
   */
  async update(id: string, updates: Partial<Resource>): Promise<Resource> {
    return await this.database.transaction(async (data) => {
      const resourceData = data.resources[id];

      if (!resourceData) {
        throw new Error(`Resource with ID ${id} not found`);
      }

      // Get current resource
      const currentResource = this.deserializeResource(resourceData);

      // Create updated resource
      const updatedResource = new Resource({
        ...currentResource,
        ...updates,
        id: currentResource.id, // Preserve original ID
        updatedAt: new Date(),
      });

      // Validate updated resource
      if (!updatedResource.isValid()) {
        throw new Error('Invalid updated resource data');
      }

      // Validate that topic exists if topicId is being updated
      if (
        updates.topicId &&
        (!data.topics[updates.topicId] ||
          data.topics[updates.topicId].isDeleted)
      ) {
        throw new Error(`Topic with ID ${updates.topicId} not found`);
      }

      // Update resource
      data.resources[id] = this.serializeResource(updatedResource);

      return updatedResource;
    });
  }

  /**
   * Deletes a resource
   */
  async delete(id: string): Promise<boolean> {
    return await this.database.transaction(async (data) => {
      if (!data.resources[id]) {
        return false;
      }

      delete data.resources[id];
      return true;
    });
  }

  /**
   * Finds all resources associated with a specific topic
   */
  async findByTopicId(topicId: string): Promise<Resource[]> {
    const data = await this.database.getData();
    const resources: Resource[] = [];

    for (const resourceData of Object.values(data.resources)) {
      if (resourceData.topicId === topicId) {
        resources.push(this.deserializeResource(resourceData));
      }
    }

    return resources.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  /**
   * Finds resources by type
   */
  async findByType(type: ResourceType): Promise<Resource[]> {
    const data = await this.database.getData();
    const resources: Resource[] = [];

    for (const resourceData of Object.values(data.resources)) {
      if (resourceData.type === type) {
        resources.push(this.deserializeResource(resourceData));
      }
    }

    return resources.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  /**
   * Finds resources by URL (exact match)
   */
  async findByUrl(url: string): Promise<Resource[]> {
    const data = await this.database.getData();
    const resources: Resource[] = [];

    for (const resourceData of Object.values(data.resources)) {
      if (resourceData.url === url) {
        resources.push(this.deserializeResource(resourceData));
      }
    }

    return resources.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  /**
   * Finds resources containing specific text in description (case-insensitive)
   */
  async findByDescription(description: string): Promise<Resource[]> {
    const data = await this.database.getData();
    const resources: Resource[] = [];
    const searchDescription = description.toLowerCase();

    for (const resourceData of Object.values(data.resources)) {
      if (resourceData.description.toLowerCase().includes(searchDescription)) {
        resources.push(this.deserializeResource(resourceData));
      }
    }

    return resources.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  /**
   * Finds resources associated with multiple topics
   */
  async findByTopicIds(topicIds: string[]): Promise<Resource[]> {
    const data = await this.database.getData();
    const resources: Resource[] = [];
    const topicIdSet = new Set(topicIds);

    for (const resourceData of Object.values(data.resources)) {
      if (topicIdSet.has(resourceData.topicId)) {
        resources.push(this.deserializeResource(resourceData));
      }
    }

    return resources.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  /**
   * Counts the number of resources for a specific topic
   */
  async countByTopicId(topicId: string): Promise<number> {
    const data = await this.database.getData();
    let count = 0;

    for (const resourceData of Object.values(data.resources)) {
      if (resourceData.topicId === topicId) {
        count++;
      }
    }

    return count;
  }

  /**
   * Counts the number of resources by type
   */
  async countByType(type: ResourceType): Promise<number> {
    const data = await this.database.getData();
    let count = 0;

    for (const resourceData of Object.values(data.resources)) {
      if (resourceData.type === type) {
        count++;
      }
    }

    return count;
  }

  /**
   * Checks if a resource with the given URL already exists for a topic
   */
  async existsByTopicAndUrl(topicId: string, url: string): Promise<boolean> {
    const data = await this.database.getData();

    for (const resourceData of Object.values(data.resources)) {
      if (resourceData.topicId === topicId && resourceData.url === url) {
        return true;
      }
    }

    return false;
  }

  /**
   * Finds resources created within a date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Resource[]> {
    const data = await this.database.getData();
    const resources: Resource[] = [];

    for (const resourceData of Object.values(data.resources)) {
      const createdAt = new Date(resourceData.createdAt);
      if (createdAt >= startDate && createdAt <= endDate) {
        resources.push(this.deserializeResource(resourceData));
      }
    }

    return resources.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  /**
   * Finds the most recently created resources
   */
  async findMostRecent(limit: number): Promise<Resource[]> {
    const data = await this.database.getData();
    const resources: Resource[] = [];

    for (const resourceData of Object.values(data.resources)) {
      resources.push(this.deserializeResource(resourceData));
    }

    return resources
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Deletes all resources associated with a topic
   */
  async deleteByTopicId(topicId: string): Promise<number> {
    return await this.database.transaction(async (data) => {
      let deletedCount = 0;
      const resourcesToDelete: string[] = [];

      // Find resources to delete
      for (const [resourceId, resourceData] of Object.entries(data.resources)) {
        if (resourceData.topicId === topicId) {
          resourcesToDelete.push(resourceId);
        }
      }

      // Delete resources
      for (const resourceId of resourcesToDelete) {
        delete data.resources[resourceId];
        deletedCount++;
      }

      return deletedCount;
    });
  }

  /**
   * Updates the topic ID for all resources (bulk operation for topic merging)
   */
  async updateTopicId(oldTopicId: string, newTopicId: string): Promise<number> {
    return await this.database.transaction(async (data) => {
      // Validate that new topic exists
      if (!data.topics[newTopicId] || data.topics[newTopicId].isDeleted) {
        throw new Error(`Target topic with ID ${newTopicId} not found`);
      }

      let updatedCount = 0;

      // Update resources
      for (const resourceData of Object.values(data.resources)) {
        if (resourceData.topicId === oldTopicId) {
          resourceData.topicId = newTopicId;
          resourceData.updatedAt = new Date();
          updatedCount++;
        }
      }

      return updatedCount;
    });
  }

  /**
   * Serializes a Resource entity for storage
   */
  private serializeResource(resource: Resource): any {
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

  /**
   * Deserializes stored data back to a Resource entity
   */
  private deserializeResource(data: any): Resource {
    return new Resource({
      id: data.id,
      topicId: data.topicId,
      url: data.url,
      description: data.description,
      type: data.type,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });
  }
}
