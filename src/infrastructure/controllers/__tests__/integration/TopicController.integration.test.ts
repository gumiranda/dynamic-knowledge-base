import request from 'supertest';
import { Express } from 'express';
import { AppServer } from '../../../server/AppServer';
import { FileDatabase } from '../../../database/FileDatabase';
import { User } from '../../../../domain/entities/User';
import { Topic } from '../../../../domain/entities/Topic';
import { UserRole } from '../../../../domain/enums/UserRole';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('TopicController Integration Tests', () => {
  let app: Express;
  let server: AppServer;
  let database: FileDatabase;
  let testDbPath: string;
  let adminUser: User;
  let editorUser: User;
  let viewerUser: User;
  let authToken: string;

  beforeAll(async () => {
    // Create temporary database for testing
    testDbPath = path.join(__dirname, `integration_test_db_${Date.now()}.json`);
    database = new FileDatabase(testDbPath);
    await database.initialize();

    // Initialize server with test database
    server = new AppServer(database);
    app = server.getApp();

    // Create test users
    adminUser = new User({
      name: 'Admin User',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
    });

    editorUser = new User({
      name: 'Editor User',
      email: 'editor@test.com',
      role: UserRole.EDITOR,
    });

    viewerUser = new User({
      name: 'Viewer User',
      email: 'viewer@test.com',
      role: UserRole.VIEWER,
    });

    // Mock authentication middleware to set user
    app.use((req, res, next) => {
      if (req.headers.authorization === 'Bearer admin-token') {
        req.user = adminUser;
      } else if (req.headers.authorization === 'Bearer editor-token') {
        req.user = editorUser;
      } else if (req.headers.authorization === 'Bearer viewer-token') {
        req.user = viewerUser;
      }
      next();
    });
  });

  afterAll(async () => {
    // Clean up test database
    await database.close();
    try {
      await fs.unlink(testDbPath);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('POST /topics', () => {
    it('should create topic successfully with admin user', async () => {
      const topicData = {
        name: 'Integration Test Topic',
        content: 'This is a test topic for integration testing',
      };

      const response = await request(app)
        .post('/topics')
        .set('Authorization', 'Bearer admin-token')
        .send(topicData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(topicData.name);
      expect(response.body.data.content).toBe(topicData.content);
      expect(response.body.data.version).toBe(1);
      expect(response.body.data.id).toBeDefined();
    });

    it('should create topic successfully with editor user', async () => {
      const topicData = {
        name: 'Editor Test Topic',
        content: 'This is a test topic created by editor',
      };

      const response = await request(app)
        .post('/topics')
        .set('Authorization', 'Bearer editor-token')
        .send(topicData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(topicData.name);
    });

    it('should reject topic creation for viewer user', async () => {
      const topicData = {
        name: 'Viewer Test Topic',
        content: 'This should fail',
      };

      const response = await request(app)
        .post('/topics')
        .set('Authorization', 'Bearer viewer-token')
        .send(topicData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should reject topic creation without authentication', async () => {
      const topicData = {
        name: 'Unauthenticated Topic',
        content: 'This should fail',
      };

      const response = await request(app)
        .post('/topics')
        .send(topicData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        content: 'Missing name field',
      };

      const response = await request(app)
        .post('/topics')
        .set('Authorization', 'Bearer admin-token')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('name');
    });

    it('should create topic with parent relationship', async () => {
      // First create parent topic
      const parentData = {
        name: 'Parent Topic',
        content: 'This is a parent topic',
      };

      const parentResponse = await request(app)
        .post('/topics')
        .set('Authorization', 'Bearer admin-token')
        .send(parentData)
        .expect(201);

      const parentId = parentResponse.body.data.id;

      // Then create child topic
      const childData = {
        name: 'Child Topic',
        content: 'This is a child topic',
        parentTopicId: parentId,
      };

      const childResponse = await request(app)
        .post('/topics')
        .set('Authorization', 'Bearer admin-token')
        .send(childData)
        .expect(201);

      expect(childResponse.body.data.parentTopicId).toBe(parentId);
    });

    it('should reject topic with non-existent parent', async () => {
      const topicData = {
        name: 'Orphan Topic',
        content: 'This should fail',
        parentTopicId: 'non-existent-parent-id',
      };

      const response = await request(app)
        .post('/topics')
        .set('Authorization', 'Bearer admin-token')
        .send(topicData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Parent topic');
    });
  });

  describe('GET /topics/:id', () => {
    let testTopicId: string;

    beforeAll(async () => {
      // Create a test topic
      const topicData = {
        name: 'Get Test Topic',
        content: 'This topic is for GET testing',
      };

      const response = await request(app)
        .post('/topics')
        .set('Authorization', 'Bearer admin-token')
        .send(topicData);

      testTopicId = response.body.data.id;
    });

    it('should retrieve topic successfully', async () => {
      const response = await request(app)
        .get(`/topics/${testTopicId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testTopicId);
      expect(response.body.data.name).toBe('Get Test Topic');
    });

    it('should allow viewer to read topics', async () => {
      const response = await request(app)
        .get(`/topics/${testTopicId}`)
        .set('Authorization', 'Bearer viewer-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testTopicId);
    });

    it('should return 404 for non-existent topic', async () => {
      const response = await request(app)
        .get('/topics/non-existent-id')
        .set('Authorization', 'Bearer admin-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/topics/${testTopicId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /topics/:id', () => {
    let testTopicId: string;

    beforeEach(async () => {
      // Create a fresh test topic for each update test
      const topicData = {
        name: 'Update Test Topic',
        content: 'This topic will be updated',
      };

      const response = await request(app)
        .post('/topics')
        .set('Authorization', 'Bearer admin-token')
        .send(topicData);

      testTopicId = response.body.data.id;
    });

    it('should update topic successfully with admin user', async () => {
      const updateData = {
        name: 'Updated Topic Name',
        content: 'Updated content',
      };

      const response = await request(app)
        .put(`/topics/${testTopicId}`)
        .set('Authorization', 'Bearer admin-token')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.content).toBe(updateData.content);
      expect(response.body.data.version).toBe(2); // Version should increment
    });

    it('should update topic successfully with editor user', async () => {
      const updateData = {
        name: 'Editor Updated Topic',
      };

      const response = await request(app)
        .put(`/topics/${testTopicId}`)
        .set('Authorization', 'Bearer editor-token')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should reject update for viewer user', async () => {
      const updateData = {
        name: 'Viewer Update Attempt',
      };

      const response = await request(app)
        .put(`/topics/${testTopicId}`)
        .set('Authorization', 'Bearer viewer-token')
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent topic', async () => {
      const updateData = {
        name: 'Update Non-existent',
      };

      const response = await request(app)
        .put('/topics/non-existent-id')
        .set('Authorization', 'Bearer admin-token')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /topics/:id', () => {
    let testTopicId: string;

    beforeEach(async () => {
      // Create a fresh test topic for each delete test
      const topicData = {
        name: 'Delete Test Topic',
        content: 'This topic will be deleted',
      };

      const response = await request(app)
        .post('/topics')
        .set('Authorization', 'Bearer admin-token')
        .send(topicData);

      testTopicId = response.body.data.id;
    });

    it('should delete topic successfully with admin user', async () => {
      const response = await request(app)
        .delete(`/topics/${testTopicId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify topic is deleted
      await request(app)
        .get(`/topics/${testTopicId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });

    it('should reject delete for editor user', async () => {
      const response = await request(app)
        .delete(`/topics/${testTopicId}`)
        .set('Authorization', 'Bearer editor-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject delete for viewer user', async () => {
      const response = await request(app)
        .delete(`/topics/${testTopicId}`)
        .set('Authorization', 'Bearer viewer-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent topic', async () => {
      const response = await request(app)
        .delete('/topics/non-existent-id')
        .set('Authorization', 'Bearer admin-token')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /topics/:id/hierarchy', () => {
    let parentTopicId: string;
    let childTopicId: string;

    beforeAll(async () => {
      // Create parent topic
      const parentResponse = await request(app)
        .post('/topics')
        .set('Authorization', 'Bearer admin-token')
        .send({
          name: 'Hierarchy Parent',
          content: 'Parent topic for hierarchy testing',
        });

      parentTopicId = parentResponse.body.data.id;

      // Create child topic
      const childResponse = await request(app)
        .post('/topics')
        .set('Authorization', 'Bearer admin-token')
        .send({
          name: 'Hierarchy Child',
          content: 'Child topic for hierarchy testing',
          parentTopicId: parentTopicId,
        });

      childTopicId = childResponse.body.data.id;
    });

    it('should retrieve topic hierarchy successfully', async () => {
      const response = await request(app)
        .get(`/topics/${parentTopicId}/hierarchy`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.topic.id).toBe(parentTopicId);
      expect(response.body.data.children).toHaveLength(1);
      expect(response.body.data.children[0].topic.id).toBe(childTopicId);
    });

    it('should allow viewer to read hierarchy', async () => {
      const response = await request(app)
        .get(`/topics/${parentTopicId}/hierarchy`)
        .set('Authorization', 'Bearer viewer-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /topics/search', () => {
    beforeAll(async () => {
      // Create searchable topics
      await request(app)
        .post('/topics')
        .set('Authorization', 'Bearer admin-token')
        .send({
          name: 'Searchable Topic One',
          content: 'This topic contains searchable content',
        });

      await request(app)
        .post('/topics')
        .set('Authorization', 'Bearer admin-token')
        .send({
          name: 'Another Topic',
          content: 'This also has searchable information',
        });
    });

    it('should search topics successfully', async () => {
      const response = await request(app)
        .get('/topics/search?q=searchable')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.topics.length).toBeGreaterThan(0);
      expect(response.body.data.searchTerm).toBe('searchable');
    });

    it('should require search query parameter', async () => {
      const response = await request(app)
        .get('/topics/search')
        .set('Authorization', 'Bearer admin-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('search term');
    });

    it('should allow viewer to search', async () => {
      const response = await request(app)
        .get('/topics/search?q=topic')
        .set('Authorization', 'Bearer viewer-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
