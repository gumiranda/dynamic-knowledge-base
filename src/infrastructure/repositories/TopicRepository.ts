import { ITopicRepository } from '../../domain/repositories/ITopicRepository';
import { Topic } from '../../domain/entities/Topic';
import { FileDatabase } from '../database/FileDatabase';

/**
 * File-based implementation of ITopicRepository with version control support
 */
export class TopicRepository implements ITopicRepository {
  constructor(private database: FileDatabase) {}

  /**
   * Finds a topic by ID (returns latest version)
   */
  async findById(id: string): Promise<Topic | null> {
    const data = await this.database.getData();
    const topicData = data.topics[id];

    if (!topicData || topicData.isDeleted || topicData.versions.length === 0) {
      return null;
    }

    // Return the latest version
    const latestVersion = topicData.versions[topicData.versions.length - 1];
    return this.deserializeTopic(latestVersion);
  }

  /**
   * Finds all topics (latest versions only, excluding deleted)
   */
  async findAll(): Promise<Topic[]> {
    const data = await this.database.getData();
    const topics: Topic[] = [];

    for (const topicData of Object.values(data.topics)) {
      if (!topicData.isDeleted && topicData.versions.length > 0) {
        const latestVersion = topicData.versions[topicData.versions.length - 1];
        topics.push(this.deserializeTopic(latestVersion));
      }
    }

    return topics.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Creates a new topic
   */
  async create(entity: Topic): Promise<Topic> {
    return await this.database.transaction(async (data) => {
      // Generate new ID if not provided
      if (!entity.id) {
        data.metadata.lastTopicId++;
        entity.id = `topic_${data.metadata.lastTopicId}`;
      }

      // Check if topic already exists
      if (data.topics[entity.id]) {
        throw new Error(`Topic with ID ${entity.id} already exists`);
      }

      // Validate entity
      if (!entity.isValid()) {
        throw new Error('Invalid topic data');
      }

      // Create topic data structure
      data.topics[entity.id] = {
        versions: [this.serializeTopic(entity)],
        currentVersion: entity.version,
        isDeleted: false,
      };

      return entity;
    });
  }

  /**
   * Updates a topic (creates new version)
   */
  async update(id: string, updates: Partial<Topic>): Promise<Topic> {
    return await this.database.transaction(async (data) => {
      const topicData = data.topics[id];

      if (!topicData || topicData.isDeleted) {
        throw new Error(`Topic with ID ${id} not found`);
      }

      // Get the latest version
      const latestVersion = topicData.versions[topicData.versions.length - 1];
      const currentTopic = this.deserializeTopic(latestVersion);

      // Create updated topic
      const updatedTopic = new Topic({
        ...currentTopic,
        ...updates,
        id: currentTopic.id, // Preserve original ID
        version: currentTopic.version + 1,
        createdAt: currentTopic.createdAt, // Preserve creation date
        updatedAt: new Date(),
      });

      // Validate updated topic
      if (!updatedTopic.isValid()) {
        throw new Error('Invalid updated topic data');
      }

      // Add new version
      topicData.versions.push(this.serializeTopic(updatedTopic));
      topicData.currentVersion = updatedTopic.version;

      return updatedTopic;
    });
  }

  /**
   * Soft deletes a topic
   */
  async delete(id: string): Promise<boolean> {
    return await this.database.transaction(async (data) => {
      const topicData = data.topics[id];

      if (!topicData || topicData.isDeleted) {
        return false;
      }

      topicData.isDeleted = true;
      topicData.deletedAt = new Date();

      return true;
    });
  }

  /**
   * Finds a specific version of a topic
   */
  async findByVersion(id: string, version: number): Promise<Topic | null> {
    const data = await this.database.getData();
    const topicData = data.topics[id];

    if (!topicData || topicData.versions.length === 0) {
      return null;
    }

    const versionData = topicData.versions.find((v) => v.version === version);
    return versionData ? this.deserializeTopic(versionData) : null;
  }

  /**
   * Finds all versions of a topic
   */
  async findAllVersions(id: string): Promise<Topic[]> {
    const data = await this.database.getData();
    const topicData = data.topics[id];

    if (!topicData || topicData.versions.length === 0) {
      return [];
    }

    return topicData.versions.map((v) => this.deserializeTopic(v));
  }

  /**
   * Finds all topics that have the specified parent ID
   */
  async findByParentId(parentId: string): Promise<Topic[]> {
    const data = await this.database.getData();
    const topics: Topic[] = [];

    for (const topicData of Object.values(data.topics)) {
      if (!topicData.isDeleted && topicData.versions.length > 0) {
        const latestVersion = topicData.versions[topicData.versions.length - 1];
        if (latestVersion.parentTopicId === parentId) {
          topics.push(this.deserializeTopic(latestVersion));
        }
      }
    }

    return topics.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Finds all root topics (topics without a parent)
   */
  async findRootTopics(): Promise<Topic[]> {
    const data = await this.database.getData();
    const topics: Topic[] = [];

    for (const topicData of Object.values(data.topics)) {
      if (!topicData.isDeleted && topicData.versions.length > 0) {
        const latestVersion = topicData.versions[topicData.versions.length - 1];
        if (!latestVersion.parentTopicId) {
          topics.push(this.deserializeTopic(latestVersion));
        }
      }
    }

    return topics.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Finds the latest version of a topic
   */
  async findLatestVersion(id: string): Promise<Topic | null> {
    return this.findById(id); // findById already returns latest version
  }

  /**
   * Gets the current version number for a topic
   */
  async getCurrentVersion(id: string): Promise<number | null> {
    const data = await this.database.getData();
    const topicData = data.topics[id];

    if (!topicData || topicData.versions.length === 0) {
      return null;
    }

    return topicData.currentVersion;
  }

  /**
   * Checks if a topic exists (any version)
   */
  async exists(id: string): Promise<boolean> {
    const data = await this.database.getData();
    const topicData = data.topics[id];
    return !!(
      topicData &&
      !topicData.isDeleted &&
      topicData.versions.length > 0
    );
  }

  /**
   * Finds topics by name (case-insensitive search)
   */
  async findByName(name: string): Promise<Topic[]> {
    const data = await this.database.getData();
    const topics: Topic[] = [];
    const searchName = name.toLowerCase();

    for (const topicData of Object.values(data.topics)) {
      if (!topicData.isDeleted && topicData.versions.length > 0) {
        const latestVersion = topicData.versions[topicData.versions.length - 1];
        if (latestVersion.name.toLowerCase().includes(searchName)) {
          topics.push(this.deserializeTopic(latestVersion));
        }
      }
    }

    return topics.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Finds topics containing specific content (case-insensitive search)
   */
  async findByContent(content: string): Promise<Topic[]> {
    const data = await this.database.getData();
    const topics: Topic[] = [];
    const searchContent = content.toLowerCase();

    for (const topicData of Object.values(data.topics)) {
      if (!topicData.isDeleted && topicData.versions.length > 0) {
        const latestVersion = topicData.versions[topicData.versions.length - 1];
        if (latestVersion.content.toLowerCase().includes(searchContent)) {
          topics.push(this.deserializeTopic(latestVersion));
        }
      }
    }

    return topics.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Soft deletes a topic (marks as deleted but preserves data)
   */
  async softDelete(id: string): Promise<boolean> {
    return this.delete(id); // delete method already implements soft delete
  }

  /**
   * Restores a soft-deleted topic
   */
  async restore(id: string): Promise<boolean> {
    return await this.database.transaction(async (data) => {
      const topicData = data.topics[id];

      if (!topicData || !topicData.isDeleted) {
        return false;
      }

      topicData.isDeleted = false;
      delete topicData.deletedAt;

      return true;
    });
  }

  /**
   * Checks if a topic is soft-deleted
   */
  async isDeleted(id: string): Promise<boolean> {
    const data = await this.database.getData();
    const topicData = data.topics[id];
    return !!(topicData && topicData.isDeleted);
  }

  /**
   * Serializes a Topic entity for storage
   */
  private serializeTopic(topic: Topic): any {
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

  /**
   * Deserializes stored data back to a Topic entity
   */
  private deserializeTopic(data: any): Topic {
    return new Topic({
      id: data.id,
      name: data.name,
      content: data.content,
      version: data.version,
      parentTopicId: data.parentTopicId,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });
  }
}
