#!/usr/bin/env node

/**
 * Database Validation Script
 * Validates database structure and integrity
 */

const fs = require('fs');
const path = require('path');

const DATABASE_PATH = path.join(__dirname, '..', 'data', 'database.json');

// Expected schema structure
const EXPECTED_SCHEMA = {
  users: 'object',
  topics: 'object',
  resources: 'object',
  metadata: 'object',
};

const EXPECTED_METADATA_FIELDS = [
  'version',
  'createdAt',
  'lastUserId',
  'lastTopicId',
  'lastResourceId',
  'schemaVersion',
];

const USER_ROLES = ['Admin', 'Editor', 'Viewer'];
const RESOURCE_TYPES = ['video', 'article', 'pdf', 'document'];

class DatabaseValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.stats = {
      users: 0,
      topics: 0,
      resources: 0,
      versions: 0,
    };
  }

  addError(message) {
    this.errors.push(message);
  }

  addWarning(message) {
    this.warnings.push(message);
  }

  validateFileExists() {
    if (!fs.existsSync(DATABASE_PATH)) {
      this.addError(`Database file not found: ${DATABASE_PATH}`);
      return false;
    }
    return true;
  }

  validateJsonStructure() {
    try {
      const data = fs.readFileSync(DATABASE_PATH, 'utf8');
      this.database = JSON.parse(data);
      return true;
    } catch (error) {
      this.addError(`Invalid JSON structure: ${error.message}`);
      return false;
    }
  }

  validateSchema() {
    // Check top-level structure
    for (const [key, expectedType] of Object.entries(EXPECTED_SCHEMA)) {
      if (!(key in this.database)) {
        this.addError(`Missing required field: ${key}`);
      } else if (typeof this.database[key] !== expectedType) {
        this.addError(
          `Invalid type for ${key}: expected ${expectedType}, got ${typeof this.database[key]}`
        );
      }
    }

    // Check metadata fields
    if (this.database.metadata) {
      for (const field of EXPECTED_METADATA_FIELDS) {
        if (!(field in this.database.metadata)) {
          this.addError(`Missing metadata field: ${field}`);
        }
      }
    }
  }

  validateUsers() {
    if (!this.database.users) return;

    for (const [userId, user] of Object.entries(this.database.users)) {
      this.stats.users++;

      // Required fields
      const requiredFields = [
        'id',
        'name',
        'email',
        'role',
        'createdAt',
        'updatedAt',
      ];
      for (const field of requiredFields) {
        if (!(field in user)) {
          this.addError(`User ${userId} missing required field: ${field}`);
        }
      }

      // Validate ID consistency
      if (user.id && user.id !== userId) {
        this.addError(`User ID mismatch: key=${userId}, id=${user.id}`);
      }

      // Validate role
      if (user.role && !USER_ROLES.includes(user.role)) {
        this.addError(`User ${userId} has invalid role: ${user.role}`);
      }

      // Validate email format
      if (user.email && !this.isValidEmail(user.email)) {
        this.addError(`User ${userId} has invalid email: ${user.email}`);
      }

      // Validate dates
      if (user.createdAt && !this.isValidDate(user.createdAt)) {
        this.addError(
          `User ${userId} has invalid createdAt date: ${user.createdAt}`
        );
      }
      if (user.updatedAt && !this.isValidDate(user.updatedAt)) {
        this.addError(
          `User ${userId} has invalid updatedAt date: ${user.updatedAt}`
        );
      }
    }
  }

  validateTopics() {
    if (!this.database.topics) return;

    const topicIds = new Set();
    const parentChildMap = new Map();

    for (const [topicId, topicData] of Object.entries(this.database.topics)) {
      this.stats.topics++;

      // Validate topic data structure
      if (!topicData.versions || !Array.isArray(topicData.versions)) {
        this.addError(`Topic ${topicId} missing or invalid versions array`);
        continue;
      }

      if (typeof topicData.currentVersion !== 'number') {
        this.addError(`Topic ${topicId} missing or invalid currentVersion`);
      }

      if (typeof topicData.deleted !== 'boolean') {
        this.addError(`Topic ${topicId} missing or invalid deleted flag`);
      }

      // Validate each version
      for (const [index, version] of topicData.versions.entries()) {
        this.stats.versions++;

        const requiredFields = [
          'id',
          'name',
          'content',
          'version',
          'createdAt',
          'updatedAt',
        ];
        for (const field of requiredFields) {
          if (!(field in version)) {
            this.addError(
              `Topic ${topicId} version ${index} missing required field: ${field}`
            );
          }
        }

        // Validate version number
        if (version.version !== index + 1) {
          this.addError(
            `Topic ${topicId} version ${index} has incorrect version number: ${version.version}`
          );
        }

        // Validate dates
        if (version.createdAt && !this.isValidDate(version.createdAt)) {
          this.addError(
            `Topic ${topicId} version ${index} has invalid createdAt date`
          );
        }
        if (version.updatedAt && !this.isValidDate(version.updatedAt)) {
          this.addError(
            `Topic ${topicId} version ${index} has invalid updatedAt date`
          );
        }

        // Track parent-child relationships
        if (version.parentTopicId) {
          if (!parentChildMap.has(version.parentTopicId)) {
            parentChildMap.set(version.parentTopicId, []);
          }
          parentChildMap.get(version.parentTopicId).push(topicId);
        }

        topicIds.add(topicId);
      }
    }

    // Validate parent-child relationships
    this.validateTopicHierarchy(topicIds, parentChildMap);
  }

  validateTopicHierarchy(topicIds, parentChildMap) {
    // Check for orphaned references
    for (const [parentId, children] of parentChildMap.entries()) {
      if (!topicIds.has(parentId)) {
        this.addError(
          `Orphaned parent reference: ${parentId} (referenced by ${children.join(', ')})`
        );
      }
    }

    // Check for circular references
    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = (topicId) => {
      if (recursionStack.has(topicId)) {
        return true; // Cycle detected
      }
      if (visited.has(topicId)) {
        return false;
      }

      visited.add(topicId);
      recursionStack.add(topicId);

      const children = parentChildMap.get(topicId) || [];
      for (const child of children) {
        if (hasCycle(child)) {
          return true;
        }
      }

      recursionStack.delete(topicId);
      return false;
    };

    for (const topicId of topicIds) {
      if (hasCycle(topicId)) {
        this.addError(
          `Circular reference detected in topic hierarchy involving: ${topicId}`
        );
        break;
      }
    }
  }

  validateResources() {
    if (!this.database.resources) return;

    const topicIds = new Set(Object.keys(this.database.topics || {}));

    for (const [resourceId, resource] of Object.entries(
      this.database.resources
    )) {
      this.stats.resources++;

      // Required fields
      const requiredFields = [
        'id',
        'topicId',
        'url',
        'description',
        'type',
        'createdAt',
        'updatedAt',
      ];
      for (const field of requiredFields) {
        if (!(field in resource)) {
          this.addError(
            `Resource ${resourceId} missing required field: ${field}`
          );
        }
      }

      // Validate ID consistency
      if (resource.id && resource.id !== resourceId) {
        this.addError(
          `Resource ID mismatch: key=${resourceId}, id=${resource.id}`
        );
      }

      // Validate topic reference
      if (resource.topicId && !topicIds.has(resource.topicId)) {
        this.addError(
          `Resource ${resourceId} references non-existent topic: ${resource.topicId}`
        );
      }

      // Validate resource type
      if (resource.type && !RESOURCE_TYPES.includes(resource.type)) {
        this.addError(
          `Resource ${resourceId} has invalid type: ${resource.type}`
        );
      }

      // Validate URL format
      if (resource.url && !this.isValidUrl(resource.url)) {
        this.addError(
          `Resource ${resourceId} has invalid URL: ${resource.url}`
        );
      }

      // Validate dates
      if (resource.createdAt && !this.isValidDate(resource.createdAt)) {
        this.addError(`Resource ${resourceId} has invalid createdAt date`);
      }
      if (resource.updatedAt && !this.isValidDate(resource.updatedAt)) {
        this.addError(`Resource ${resourceId} has invalid updatedAt date`);
      }
    }
  }

  validateMetadata() {
    if (!this.database.metadata) return;

    const metadata = this.database.metadata;

    // Validate counters
    if (metadata.lastUserId < this.stats.users) {
      this.addWarning(
        `lastUserId (${metadata.lastUserId}) is less than actual user count (${this.stats.users})`
      );
    }

    if (metadata.lastTopicId < this.stats.topics) {
      this.addWarning(
        `lastTopicId (${metadata.lastTopicId}) is less than actual topic count (${this.stats.topics})`
      );
    }

    if (metadata.lastResourceId < this.stats.resources) {
      this.addWarning(
        `lastResourceId (${metadata.lastResourceId}) is less than actual resource count (${this.stats.resources})`
      );
    }

    // Validate dates
    if (metadata.createdAt && !this.isValidDate(metadata.createdAt)) {
      this.addError(
        `Metadata has invalid createdAt date: ${metadata.createdAt}`
      );
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  validate() {
    console.log('🔍 Validating database...');

    if (!this.validateFileExists()) {
      return false;
    }

    if (!this.validateJsonStructure()) {
      return false;
    }

    this.validateSchema();
    this.validateUsers();
    this.validateTopics();
    this.validateResources();
    this.validateMetadata();

    return this.errors.length === 0;
  }

  generateReport() {
    console.log('\n📊 Database Validation Report');
    console.log('================================');

    // Statistics
    console.log('\n📈 Statistics:');
    console.log(`   Users: ${this.stats.users}`);
    console.log(`   Topics: ${this.stats.topics}`);
    console.log(`   Topic Versions: ${this.stats.versions}`);
    console.log(`   Resources: ${this.stats.resources}`);

    // File info
    if (fs.existsSync(DATABASE_PATH)) {
      const stats = fs.statSync(DATABASE_PATH);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`   Database Size: ${sizeKB} KB`);
      console.log(`   Last Modified: ${stats.mtime.toISOString()}`);
    }

    // Errors
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    // Summary
    console.log('\n📋 Summary:');
    if (this.errors.length === 0) {
      console.log('   ✅ Database validation passed');
      if (this.warnings.length > 0) {
        console.log(`   ⚠️  ${this.warnings.length} warning(s) found`);
      }
    } else {
      console.log(
        `   ❌ Database validation failed with ${this.errors.length} error(s)`
      );
      if (this.warnings.length > 0) {
        console.log(`   ⚠️  ${this.warnings.length} warning(s) also found`);
      }
    }

    return this.errors.length === 0;
  }
}

function main() {
  const validator = new DatabaseValidator();
  const isValid = validator.validate();
  const reportPassed = validator.generateReport();

  process.exit(isValid && reportPassed ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { DatabaseValidator };
