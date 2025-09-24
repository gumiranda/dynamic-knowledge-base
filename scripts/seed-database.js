#!/usr/bin/env node

/**
 * Database Seeding Script
 * Adds sample data for development and testing
 */

const fs = require('fs');
const path = require('path');

const DATABASE_PATH = path.join(__dirname, '..', 'data', 'database.json');

// Sample users
const sampleUsers = [
  {
    id: 'user_002',
    name: 'John Editor',
    email: 'editor@example.com',
    role: 'Editor',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user_003',
    name: 'Jane Viewer',
    email: 'viewer@example.com',
    role: 'Viewer',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user_004',
    name: 'Bob Developer',
    email: 'developer@example.com',
    role: 'Editor',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Sample topics with hierarchy
const sampleTopics = [
  {
    id: 'topic_002',
    name: 'Computer Science',
    content:
      'Computer Science is the study of computational systems and the design of computer systems and their applications.',
    version: 1,
    parentTopicId: 'topic_001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: false,
  },
  {
    id: 'topic_003',
    name: 'Programming Languages',
    content:
      'Programming languages are formal languages comprising a set of instructions that produce various kinds of output.',
    version: 1,
    parentTopicId: 'topic_002',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: false,
  },
  {
    id: 'topic_004',
    name: 'JavaScript',
    content:
      'JavaScript is a high-level, interpreted programming language that conforms to the ECMAScript specification.',
    version: 1,
    parentTopicId: 'topic_003',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: false,
  },
  {
    id: 'topic_005',
    name: 'TypeScript',
    content:
      'TypeScript is a programming language developed by Microsoft. It is a strict syntactical superset of JavaScript.',
    version: 1,
    parentTopicId: 'topic_003',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: false,
  },
  {
    id: 'topic_006',
    name: 'Machine Learning',
    content:
      'Machine Learning is a method of data analysis that automates analytical model building.',
    version: 1,
    parentTopicId: 'topic_002',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: false,
  },
  {
    id: 'topic_007',
    name: 'Neural Networks',
    content:
      'Neural networks are computing systems vaguely inspired by the biological neural networks.',
    version: 1,
    parentTopicId: 'topic_006',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: false,
  },
  {
    id: 'topic_008',
    name: 'Web Development',
    content:
      'Web development is the work involved in developing a website for the Internet or an intranet.',
    version: 1,
    parentTopicId: 'topic_001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: false,
  },
  {
    id: 'topic_009',
    name: 'Frontend Development',
    content:
      'Frontend development is the practice of converting data to a graphical interface for users to view and interact with.',
    version: 1,
    parentTopicId: 'topic_008',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: false,
  },
  {
    id: 'topic_010',
    name: 'Backend Development',
    content:
      'Backend development refers to the server-side development of web applications.',
    version: 1,
    parentTopicId: 'topic_008',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: false,
  },
];

// Sample resources
const sampleResources = [
  {
    id: 'resource_001',
    topicId: 'topic_004',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    description:
      'MDN JavaScript Documentation - Comprehensive guide to JavaScript',
    type: 'article',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'resource_002',
    topicId: 'topic_005',
    url: 'https://www.typescriptlang.org/docs/',
    description: 'Official TypeScript Documentation',
    type: 'article',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'resource_003',
    topicId: 'topic_006',
    url: 'https://www.coursera.org/learn/machine-learning',
    description: 'Machine Learning Course by Andrew Ng',
    type: 'video',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'resource_004',
    topicId: 'topic_007',
    url: 'https://www.deeplearningbook.org/',
    description: 'Deep Learning Book by Ian Goodfellow',
    type: 'pdf',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'resource_005',
    topicId: 'topic_009',
    url: 'https://reactjs.org/docs/getting-started.html',
    description: 'React.js Official Documentation',
    type: 'article',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'resource_006',
    topicId: 'topic_010',
    url: 'https://nodejs.org/en/docs/',
    description: 'Node.js Official Documentation',
    type: 'article',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function loadDatabase() {
  if (!fs.existsSync(DATABASE_PATH)) {
    console.error('❌ Database not found. Run npm run db:init first.');
    process.exit(1);
  }

  try {
    const data = fs.readFileSync(DATABASE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load database:', error.message);
    process.exit(1);
  }
}

function saveDatabase(database) {
  try {
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(database, null, 2));
  } catch (error) {
    console.error('❌ Failed to save database:', error.message);
    process.exit(1);
  }
}

function seedDatabase() {
  console.log('🌱 Seeding database with sample data...');

  const database = loadDatabase();

  // Add sample users
  console.log('👥 Adding sample users...');
  sampleUsers.forEach((user) => {
    if (!database.users[user.id]) {
      database.users[user.id] = user;
      console.log(`   ✅ Added user: ${user.name} (${user.role})`);
    } else {
      console.log(`   ⚠️  User already exists: ${user.name}`);
    }
  });

  // Add sample topics
  console.log('📖 Adding sample topics...');
  sampleTopics.forEach((topic) => {
    if (!database.topics[topic.id]) {
      database.topics[topic.id] = {
        versions: [topic],
        currentVersion: 1,
        deleted: false,
      };
      console.log(`   ✅ Added topic: ${topic.name}`);
    } else {
      console.log(`   ⚠️  Topic already exists: ${topic.name}`);
    }
  });

  // Add sample resources
  console.log('📎 Adding sample resources...');
  sampleResources.forEach((resource) => {
    if (!database.resources[resource.id]) {
      database.resources[resource.id] = resource;
      console.log(`   ✅ Added resource: ${resource.description}`);
    } else {
      console.log(`   ⚠️  Resource already exists: ${resource.description}`);
    }
  });

  // Update metadata
  database.metadata.lastUserId = Math.max(
    database.metadata.lastUserId,
    sampleUsers.length + 1
  );
  database.metadata.lastTopicId = Math.max(
    database.metadata.lastTopicId,
    sampleTopics.length + 1
  );
  database.metadata.lastResourceId = Math.max(
    database.metadata.lastResourceId,
    sampleResources.length
  );
  database.metadata.seededAt = new Date().toISOString();

  // Save database
  saveDatabase(database);

  console.log('✅ Database seeded successfully!');
  console.log(`📊 Summary:`);
  console.log(`   Users: ${Object.keys(database.users).length}`);
  console.log(`   Topics: ${Object.keys(database.topics).length}`);
  console.log(`   Resources: ${Object.keys(database.resources).length}`);
}

function main() {
  seedDatabase();
}

if (require.main === module) {
  main();
}

module.exports = { seedDatabase, sampleUsers, sampleTopics, sampleResources };
