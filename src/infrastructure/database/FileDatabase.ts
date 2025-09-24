import * as fs from 'fs/promises';
import * as path from 'path';
import {
  DatabaseSchema,
  createEmptyDatabase,
  DatabaseBackup,
} from './DatabaseSchema';

/**
 * File-based JSON database with atomic operations and backup support
 */
export class FileDatabase {
  private readonly dbPath: string;
  private readonly backupDir: string;
  private readonly lockFile: string;
  private data: DatabaseSchema | null = null;
  private isLocked = false;

  constructor(dbPath: string = './data/database.json') {
    this.dbPath = path.resolve(dbPath);
    this.backupDir = path.join(path.dirname(this.dbPath), 'backups');
    this.lockFile = `${this.dbPath}.lock`;
  }

  /**
   * Initializes the database, creating necessary directories and files
   */
  async initialize(): Promise<void> {
    try {
      // Create data directory if it doesn't exist
      const dbDir = path.dirname(this.dbPath);
      await fs.mkdir(dbDir, { recursive: true });

      // Create backup directory
      await fs.mkdir(this.backupDir, { recursive: true });

      // Check if database file exists
      try {
        await fs.access(this.dbPath);
        // File exists, load it
        await this.loadDatabase();
      } catch {
        // File doesn't exist, create empty database
        this.data = createEmptyDatabase();
        await this.saveDatabase();
      }

      // Clean up any stale lock files
      await this.cleanupLockFile();
    } catch (error) {
      throw new Error(
        `Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Loads the database from file
   */
  private async loadDatabase(): Promise<void> {
    try {
      const fileContent = await fs.readFile(this.dbPath, 'utf-8');
      const parsedData = JSON.parse(fileContent);

      // Convert date strings back to Date objects
      this.data = this.deserializeDatabase(parsedData);
    } catch (error) {
      throw new Error(
        `Failed to load database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Saves the database to file with atomic operation
   */
  private async saveDatabase(): Promise<void> {
    if (!this.data) {
      throw new Error('No data to save');
    }

    const tempPath = `${this.dbPath}.tmp`;

    try {
      // Update metadata
      this.data.metadata.lastModified = new Date();

      // Write to temporary file first
      const serializedData = JSON.stringify(this.data, null, 2);
      await fs.writeFile(tempPath, serializedData, 'utf-8');

      // Atomic rename operation
      await fs.rename(tempPath, this.dbPath);
    } catch (error) {
      // Clean up temporary file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw new Error(
        `Failed to save database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Acquires a lock for atomic operations
   */
  private async acquireLock(): Promise<void> {
    const maxRetries = 10;
    const retryDelay = 100; // ms

    for (let i = 0; i < maxRetries; i++) {
      try {
        // Check if already locked by this instance
        if (this.isLocked) {
          return;
        }

        // Try to create lock file
        await fs.writeFile(this.lockFile, process.pid.toString(), {
          flag: 'wx',
        });
        this.isLocked = true;
        return;
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // Lock file exists, check if process is still running
          try {
            const lockContent = await fs.readFile(this.lockFile, 'utf-8');
            const lockPid = parseInt(lockContent.trim());

            // Check if process is still running
            try {
              process.kill(lockPid, 0); // Signal 0 just checks if process exists
              // Process exists, wait and retry
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
              continue;
            } catch {
              // Process doesn't exist, remove stale lock
              await fs.unlink(this.lockFile);
              continue;
            }
          } catch {
            // Can't read lock file, try to remove it
            try {
              await fs.unlink(this.lockFile);
            } catch {
              // Ignore cleanup errors
            }
            continue;
          }
        } else {
          throw error;
        }
      }
    }

    throw new Error('Failed to acquire database lock after maximum retries');
  }

  /**
   * Releases the database lock
   */
  private async releaseLock(): Promise<void> {
    if (this.isLocked) {
      try {
        await fs.unlink(this.lockFile);
      } catch {
        // Ignore errors when releasing lock
      }
      this.isLocked = false;
    }
  }

  /**
   * Cleans up stale lock files
   */
  private async cleanupLockFile(): Promise<void> {
    try {
      const lockContent = await fs.readFile(this.lockFile, 'utf-8');
      const lockPid = parseInt(lockContent.trim());

      try {
        process.kill(lockPid, 0);
        // Process exists, don't clean up
      } catch {
        // Process doesn't exist, remove stale lock
        await fs.unlink(this.lockFile);
      }
    } catch {
      // Lock file doesn't exist or can't be read, nothing to clean up
    }
  }

  /**
   * Executes a transaction with automatic locking
   */
  async transaction<T>(
    operation: (data: DatabaseSchema) => Promise<T> | T
  ): Promise<T> {
    await this.acquireLock();

    try {
      if (!this.data) {
        await this.loadDatabase();
      }

      if (!this.data) {
        throw new Error('Database not initialized');
      }

      const result = await operation(this.data);
      await this.saveDatabase();
      return result;
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Gets a read-only copy of the database
   */
  async getData(): Promise<DatabaseSchema> {
    if (!this.data) {
      await this.loadDatabase();
    }

    if (!this.data) {
      throw new Error('Database not initialized');
    }

    // Return a deep copy to prevent external modifications
    return JSON.parse(JSON.stringify(this.data));
  }

  /**
   * Creates a backup of the current database
   */
  async createBackup(): Promise<string> {
    if (!this.data) {
      await this.loadDatabase();
    }

    if (!this.data) {
      throw new Error('Database not initialized');
    }

    const timestamp = new Date();
    const backupFileName = `backup_${timestamp.toISOString().replace(/[:.]/g, '-')}.json`;
    const backupPath = path.join(this.backupDir, backupFileName);

    const backup: DatabaseBackup = {
      data: this.data,
      timestamp,
      version: this.data.metadata.version,
    };

    await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
    return backupPath;
  }

  /**
   * Restores database from a backup file
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    await this.acquireLock();

    try {
      const backupContent = await fs.readFile(backupPath, 'utf-8');
      const backup: DatabaseBackup = JSON.parse(backupContent);

      this.data = this.deserializeDatabase(backup.data);
      await this.saveDatabase();
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Lists available backup files
   */
  async listBackups(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      return files
        .filter((file) => file.startsWith('backup_') && file.endsWith('.json'))
        .sort()
        .reverse(); // Most recent first
    } catch {
      return [];
    }
  }

  /**
   * Cleans up old backup files, keeping only the specified number
   */
  async cleanupBackups(keepCount: number = 10): Promise<void> {
    const backups = await this.listBackups();

    if (backups.length > keepCount) {
      const toDelete = backups.slice(keepCount);

      for (const backup of toDelete) {
        try {
          await fs.unlink(path.join(this.backupDir, backup));
        } catch {
          // Ignore individual file deletion errors
        }
      }
    }
  }

  /**
   * Deserializes database data, converting date strings back to Date objects
   */
  private deserializeDatabase(data: any): DatabaseSchema {
    // Convert metadata dates
    if (data.metadata) {
      if (data.metadata.createdAt) {
        data.metadata.createdAt = new Date(data.metadata.createdAt);
      }
      if (data.metadata.lastModified) {
        data.metadata.lastModified = new Date(data.metadata.lastModified);
      }
    }

    // Convert topic dates
    if (data.topics) {
      for (const topicData of Object.values(data.topics) as any[]) {
        if (topicData.deletedAt) {
          topicData.deletedAt = new Date(topicData.deletedAt);
        }
        if (topicData.versions) {
          for (const version of topicData.versions) {
            if (version.createdAt) {
              version.createdAt = new Date(version.createdAt);
            }
            if (version.updatedAt) {
              version.updatedAt = new Date(version.updatedAt);
            }
          }
        }
      }
    }

    // Convert resource dates
    if (data.resources) {
      for (const resource of Object.values(data.resources) as any[]) {
        if (resource.createdAt) {
          resource.createdAt = new Date(resource.createdAt);
        }
        if (resource.updatedAt) {
          resource.updatedAt = new Date(resource.updatedAt);
        }
      }
    }

    // Convert user dates
    if (data.users) {
      for (const user of Object.values(data.users) as any[]) {
        if (user.createdAt) {
          user.createdAt = new Date(user.createdAt);
        }
        if (user.updatedAt) {
          user.updatedAt = new Date(user.updatedAt);
        }
      }
    }

    return data as DatabaseSchema;
  }

  /**
   * Gets database statistics
   */
  async getStats(): Promise<{
    topicCount: number;
    resourceCount: number;
    userCount: number;
    totalVersions: number;
    databaseSize: number;
    lastModified: Date;
  }> {
    if (!this.data) {
      await this.loadDatabase();
    }

    if (!this.data) {
      throw new Error('Database not initialized');
    }

    const topicCount = Object.keys(this.data.topics).length;
    const resourceCount = Object.keys(this.data.resources).length;
    const userCount = Object.keys(this.data.users).length;

    const totalVersions = Object.values(this.data.topics).reduce(
      (sum, topic) => sum + topic.versions.length,
      0
    );

    let databaseSize = 0;
    try {
      const stats = await fs.stat(this.dbPath);
      databaseSize = stats.size;
    } catch {
      // Ignore file stat errors
    }

    return {
      topicCount,
      resourceCount,
      userCount,
      totalVersions,
      databaseSize,
      lastModified: this.data.metadata.lastModified,
    };
  }

  /**
   * Closes the database connection and cleans up resources
   */
  async close(): Promise<void> {
    await this.releaseLock();
    this.data = null;
  }
}
