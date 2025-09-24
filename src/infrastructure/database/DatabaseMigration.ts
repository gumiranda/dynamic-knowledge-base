import { DatabaseSchema, createEmptyDatabase } from './DatabaseSchema';
import { FileDatabase } from './FileDatabase';

/**
 * Interface for database migration
 */
export interface Migration {
  version: string;
  description: string;
  up: (data: DatabaseSchema) => Promise<DatabaseSchema> | DatabaseSchema;
  down: (data: DatabaseSchema) => Promise<DatabaseSchema> | DatabaseSchema;
}

/**
 * Database migration manager
 */
export class DatabaseMigration {
  private migrations: Migration[] = [];

  constructor(private database: FileDatabase) {}

  /**
   * Registers a migration
   */
  addMigration(migration: Migration): void {
    this.migrations.push(migration);
    // Sort migrations by version
    this.migrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  /**
   * Runs all pending migrations
   */
  async migrate(): Promise<void> {
    const currentData = await this.database.getData();
    const currentVersion = currentData.metadata.version;

    const pendingMigrations = this.migrations.filter(
      (migration) => migration.version > currentVersion
    );

    if (pendingMigrations.length === 0) {
      return; // No migrations to run
    }

    // Create backup before migration
    await this.database.createBackup();

    for (const migration of pendingMigrations) {
      await this.database.transaction(async (data) => {
        console.log(
          `Running migration: ${migration.version} - ${migration.description}`
        );
        const migratedData = await migration.up(data);

        // Update version
        migratedData.metadata.version = migration.version;
        migratedData.metadata.lastModified = new Date();

        // Copy migrated data back to original object
        Object.assign(data, migratedData);
      });
    }
  }

  /**
   * Rolls back to a specific version
   */
  async rollback(targetVersion: string): Promise<void> {
    const currentData = await this.database.getData();
    const currentVersion = currentData.metadata.version;

    if (targetVersion >= currentVersion) {
      throw new Error('Target version must be lower than current version');
    }

    const migrationsToRollback = this.migrations
      .filter(
        (migration) =>
          migration.version > targetVersion &&
          migration.version <= currentVersion
      )
      .reverse(); // Rollback in reverse order

    // Create backup before rollback
    await this.database.createBackup();

    for (const migration of migrationsToRollback) {
      await this.database.transaction(async (data) => {
        console.log(
          `Rolling back migration: ${migration.version} - ${migration.description}`
        );
        const rolledBackData = await migration.down(data);

        // Find the previous migration version
        const previousMigration = this.migrations
          .filter((m) => m.version < migration.version)
          .pop();

        rolledBackData.metadata.version = previousMigration?.version || '1.0.0';
        rolledBackData.metadata.lastModified = new Date();

        // Copy rolled back data to original object
        Object.assign(data, rolledBackData);
      });
    }
  }

  /**
   * Gets the list of available migrations
   */
  getMigrations(): Migration[] {
    return [...this.migrations];
  }

  /**
   * Gets pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const currentData = await this.database.getData();
    const currentVersion = currentData.metadata.version;

    return this.migrations.filter(
      (migration) => migration.version > currentVersion
    );
  }
}

/**
 * Database initialization utility
 */
export class DatabaseInitializer {
  constructor(private database: FileDatabase) {}

  /**
   * Initializes the database with default data
   */
  async initialize(): Promise<void> {
    await this.database.initialize();

    // Check if database is empty and needs seeding
    const stats = await this.database.getStats();

    if (stats.userCount === 0) {
      await this.seedDefaultData();
    }
  }

  /**
   * Seeds the database with default data
   */
  private async seedDefaultData(): Promise<void> {
    await this.database.transaction(async (data) => {
      // Create default admin user
      const adminUser = {
        id: 'user_1',
        name: 'System Administrator',
        email: 'admin@example.com',
        role: 'Admin' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      data.users[adminUser.id] = adminUser as any;
      data.metadata.lastUserId = 1;

      console.log('Database seeded with default admin user');
    });
  }

  /**
   * Resets the database to empty state
   */
  async reset(): Promise<void> {
    await this.database.transaction(async (data) => {
      const emptyDb = createEmptyDatabase();
      Object.assign(data, emptyDb);
      console.log('Database reset to empty state');
    });
  }

  /**
   * Validates database integrity
   */
  async validateIntegrity(): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const data = await this.database.getData();
    const errors: string[] = [];

    // Validate metadata
    if (!data.metadata) {
      errors.push('Missing metadata');
    } else {
      if (!data.metadata.version) {
        errors.push('Missing version in metadata');
      }
      if (!data.metadata.createdAt) {
        errors.push('Missing createdAt in metadata');
      }
      if (!data.metadata.lastModified) {
        errors.push('Missing lastModified in metadata');
      }
    }

    // Validate topics
    for (const [topicId, topicData] of Object.entries(data.topics)) {
      if (!topicData.versions || !Array.isArray(topicData.versions)) {
        errors.push(`Topic ${topicId} missing versions array`);
        continue;
      }

      if (topicData.versions.length === 0) {
        errors.push(`Topic ${topicId} has no versions`);
        continue;
      }

      if (typeof topicData.currentVersion !== 'number') {
        errors.push(`Topic ${topicId} missing currentVersion`);
      }

      // Validate each version
      for (const version of topicData.versions) {
        if (!version.id || !version.name || version.version === undefined) {
          errors.push(`Topic ${topicId} has invalid version data`);
        }
      }
    }

    // Validate resources
    for (const [resourceId, resource] of Object.entries(data.resources)) {
      if (!resource.id || !resource.topicId || !resource.url) {
        errors.push(`Resource ${resourceId} missing required fields`);
      }

      // Check if referenced topic exists
      if (!data.topics[resource.topicId]) {
        errors.push(
          `Resource ${resourceId} references non-existent topic ${resource.topicId}`
        );
      }
    }

    // Validate users
    for (const [userId, user] of Object.entries(data.users)) {
      if (!user.id || !user.name || !user.email || !user.role) {
        errors.push(`User ${userId} missing required fields`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Example migrations
export const defaultMigrations: Migration[] = [
  {
    version: '1.1.0',
    description: 'Add soft delete support for topics',
    up: (data: DatabaseSchema) => {
      // Add isDeleted and deletedAt fields to existing topics
      for (const topicData of Object.values(data.topics)) {
        if (topicData.isDeleted === undefined) {
          topicData.isDeleted = false;
        }
      }
      return data;
    },
    down: (data: DatabaseSchema) => {
      // Remove soft delete fields
      for (const topicData of Object.values(data.topics)) {
        delete topicData.isDeleted;
        delete topicData.deletedAt;
      }
      return data;
    },
  },
];
