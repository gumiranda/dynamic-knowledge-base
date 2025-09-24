import { FileDatabase } from '../../infrastructure/database/FileDatabase';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Utilities for database testing setup and teardown
 */
export class DatabaseTestUtils {
  private static testDatabases: Set<string> = new Set();

  /**
   * Creates a temporary test database
   */
  static async createTestDatabase(testName?: string): Promise<{
    database: FileDatabase;
    dbPath: string;
    cleanup: () => Promise<void>;
  }> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const testId = testName
      ? `${testName}_${timestamp}`
      : `test_${timestamp}_${randomId}`;
    const dbPath = path.join(__dirname, '..', 'temp', `${testId}.json`);

    // Ensure temp directory exists
    const tempDir = path.dirname(dbPath);
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    const database = new FileDatabase(dbPath);
    await database.initialize();

    // Track this database for cleanup
    this.testDatabases.add(dbPath);

    const cleanup = async () => {
      try {
        await database.close();
        await fs.unlink(dbPath);
        this.testDatabases.delete(dbPath);
      } catch (error) {
        // Ignore cleanup errors
        console.warn(`Failed to cleanup test database ${dbPath}:`, error);
      }
    };

    return { database, dbPath, cleanup };
  }

  /**
   * Creates an in-memory test database (for faster tests)
   */
  static async createInMemoryTestDatabase(): Promise<{
    database: FileDatabase;
    cleanup: () => Promise<void>;
  }> {
    // Use a temporary file that we'll delete immediately after creation
    const { database, cleanup: fileCleanup } =
      await this.createTestDatabase('inmemory');

    // Override the database to work in memory
    const originalData = await database.getData();

    // Mock the read/write operations to work with in-memory data
    let memoryData = { ...originalData };

    const originalGetData = database.getData.bind(database);

    database.getData = async () => ({ ...memoryData });

    const cleanup = async () => {
      // Restore original methods
      database.getData = originalGetData;
      await fileCleanup();
    };

    return { database, cleanup };
  }

  /**
   * Seeds a database with test data
   */
  static async seedDatabase(
    database: FileDatabase,
    seedData: {
      users?: any[];
      topics?: any[];
      resources?: any[];
    }
  ): Promise<void> {
    const data = await database.getData();

    if (seedData.users) {
      seedData.users.forEach((user) => {
        data.users[user.id] = user;
      });
    }

    if (seedData.topics) {
      seedData.topics.forEach((topic) => {
        if (!data.topics[topic.id]) {
          data.topics[topic.id] = {
            versions: [],
            currentVersion: 0,
            isDeleted: false,
          };
        }
        data.topics[topic.id].versions.push(topic);
        data.topics[topic.id].currentVersion = topic.version;
      });
    }

    if (seedData.resources) {
      seedData.resources.forEach((resource) => {
        data.resources[resource.id] = resource;
      });
    }

    // Note: FileDatabase doesn't expose write method directly
    throw new Error('Direct write operations not supported on FileDatabase');
  }

  /**
   * Clears all data from a database
   */
  static async clearDatabase(_database: FileDatabase): Promise<void> {
    // Note: This method would clear the database if it had write access
    // const _emptyData = {
    //   users: {},
    //   topics: {},
    //   resources: {},
    //   metadata: {
    //     lastTopicId: 0,
    //     lastResourceId: 0,
    //     lastUserId: 0,
    //   },
    // };

    // Note: FileDatabase doesn't expose write method directly
    throw new Error('Direct write operations not supported on FileDatabase');
  }

  /**
   * Creates a database snapshot for rollback testing
   */
  static async createSnapshot(database: FileDatabase): Promise<any> {
    return await database.getData();
  }

  /**
   * Restores a database from a snapshot
   */
  static async restoreSnapshot(
    _database: FileDatabase,
    _snapshot: any
  ): Promise<void> {
    // Note: FileDatabase doesn't expose write method directly
    throw new Error('Direct write operations not supported on FileDatabase');
  }

  /**
   * Cleans up all test databases (call in global teardown)
   */
  static async cleanupAllTestDatabases(): Promise<void> {
    const cleanupPromises = Array.from(this.testDatabases).map(
      async (dbPath) => {
        try {
          await fs.unlink(dbPath);
        } catch (error) {
          // Ignore errors - file might already be deleted
        }
      }
    );

    await Promise.all(cleanupPromises);
    this.testDatabases.clear();

    // Also clean up temp directory if empty
    try {
      const tempDir = path.join(__dirname, '..', 'temp');
      const files = await fs.readdir(tempDir);
      if (files.length === 0) {
        await fs.rmdir(tempDir);
      }
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Validates database integrity
   */
  static async validateDatabaseIntegrity(database: FileDatabase): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const data = await database.getData();

    // Check required structure
    if (!data.users || typeof data.users !== 'object') {
      errors.push('Missing or invalid users collection');
    }

    if (!data.topics || typeof data.topics !== 'object') {
      errors.push('Missing or invalid topics collection');
    }

    if (!data.resources || typeof data.resources !== 'object') {
      errors.push('Missing or invalid resources collection');
    }

    if (!data.metadata || typeof data.metadata !== 'object') {
      errors.push('Missing or invalid metadata');
    }

    // Check topic version integrity
    Object.entries(data.topics || {}).forEach(
      ([topicId, topicData]: [string, any]) => {
        if (!Array.isArray(topicData.versions)) {
          errors.push(`Topic ${topicId} has invalid versions array`);
        }

        if (typeof topicData.currentVersion !== 'number') {
          errors.push(`Topic ${topicId} has invalid currentVersion`);
        }

        if (topicData.versions.length > 0) {
          const maxVersion = Math.max(
            ...topicData.versions.map((v: any) => v.version)
          );
          if (topicData.currentVersion !== maxVersion) {
            errors.push(
              `Topic ${topicId} currentVersion doesn't match max version`
            );
          }
        }
      }
    );

    // Check resource-topic relationships
    Object.values(data.resources || {}).forEach((resource: any) => {
      if (resource.topicId && !data.topics[resource.topicId]) {
        errors.push(
          `Resource ${resource.id} references non-existent topic ${resource.topicId}`
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Gets database statistics for testing
   */
  static async getDatabaseStats(database: FileDatabase): Promise<{
    userCount: number;
    topicCount: number;
    resourceCount: number;
    totalVersions: number;
    deletedTopics: number;
  }> {
    const data = await database.getData();

    const userCount = Object.keys(data.users || {}).length;
    const topicCount = Object.keys(data.topics || {}).length;
    const resourceCount = Object.keys(data.resources || {}).length;

    let totalVersions = 0;
    let deletedTopics = 0;

    Object.values(data.topics || {}).forEach((topicData: any) => {
      totalVersions += topicData.versions?.length || 0;
      if (topicData.isDeleted) {
        deletedTopics++;
      }
    });

    return {
      userCount,
      topicCount,
      resourceCount,
      totalVersions,
      deletedTopics,
    };
  }
}
