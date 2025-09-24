#!/usr/bin/env node

/**
 * Database Initialization Script
 * Creates a new database with initial structure and sample data
 */

const fs = require('fs');
const path = require('path');

const DATABASE_PATH = path.join(__dirname, '..', 'data', 'database.json');
const DATA_DIR = path.join(__dirname, '..', 'data');

// Initial database structure
const initialDatabase = {
  users: {},
  topics: {},
  resources: {},
  metadata: {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    lastUserId: 0,
    lastTopicId: 0,
    lastResourceId: 0,
    schemaVersion: 1,
  },
};

// Sample admin user
const adminUser = {
  id: 'user_001',
  name: 'System Administrator',
  email: 'admin@example.com',
  role: 'Admin',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Sample root topic
const rootTopic = {
  id: 'topic_001',
  name: 'Knowledge Base',
  content:
    'Welcome to the Dynamic Knowledge Base. This is the root topic that contains all other topics.',
  version: 1,
  parentTopicId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deleted: false,
};

function createDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('✅ Created data directory');
  }
}

function initializeDatabase() {
  try {
    // Check if database already exists
    if (fs.existsSync(DATABASE_PATH)) {
      console.log(
        '⚠️  Database already exists. Use npm run db:reset to recreate.'
      );
      return;
    }

    // Create data directory
    createDataDirectory();

    // Add sample data
    initialDatabase.users[adminUser.id] = adminUser;
    initialDatabase.topics[rootTopic.id] = {
      versions: [rootTopic],
      currentVersion: 1,
      deleted: false,
    };
    initialDatabase.metadata.lastUserId = 1;
    initialDatabase.metadata.lastTopicId = 1;

    // Write database file
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(initialDatabase, null, 2));

    console.log('✅ Database initialized successfully');
    console.log(`📁 Database location: ${DATABASE_PATH}`);
    console.log('👤 Default admin user created:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log('📖 Root topic created: "Knowledge Base"');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
    process.exit(1);
  }
}

function main() {
  console.log('🚀 Initializing Dynamic Knowledge Base database...');
  initializeDatabase();
  console.log('✨ Database initialization complete!');
}

if (require.main === module) {
  main();
}

module.exports = { initializeDatabase, initialDatabase };
