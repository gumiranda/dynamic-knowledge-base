import { Topic } from '../../domain/entities/Topic';
import { Resource } from '../../domain/entities/Resource';
import { User } from '../../domain/entities/User';

/**
 * Interface defining the structure of the JSON database
 */
export interface DatabaseSchema {
  /**
   * Topics collection with version control
   * Key: topic base ID, Value: topic versions data
   */
  topics: {
    [topicId: string]: {
      versions: Topic[];
      currentVersion: number;
      isDeleted: boolean;
      deletedAt?: Date;
    };
  };

  /**
   * Resources collection
   * Key: resource ID, Value: resource data
   */
  resources: {
    [resourceId: string]: Resource;
  };

  /**
   * Users collection
   * Key: user ID, Value: user data
   */
  users: {
    [userId: string]: User;
  };

  /**
   * Metadata for database management
   */
  metadata: {
    lastTopicId: number;
    lastResourceId: number;
    lastUserId: number;
    createdAt: Date;
    lastModified: Date;
    version: string;
  };
}

/**
 * Default empty database schema
 */
export const createEmptyDatabase = (): DatabaseSchema => ({
  topics: {},
  resources: {},
  users: {},
  metadata: {
    lastTopicId: 0,
    lastResourceId: 0,
    lastUserId: 0,
    createdAt: new Date(),
    lastModified: new Date(),
    version: '1.0.0',
  },
});

/**
 * Type for database backup data
 */
export interface DatabaseBackup {
  data: DatabaseSchema;
  timestamp: Date;
  version: string;
}
