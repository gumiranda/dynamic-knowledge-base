import request from 'supertest';
import express, { Express } from 'express';
import { AppServer } from '../../../server/AppServer';
import { FileDatabase } from '../../../database/FileDatabase';
import { User } from '../../../../domain/entities/User';
import { UserRole } from '../../../../domain/enums/UserRole';
import { ResourceType } from '../../../../domain/enums/ResourceType';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('ResourceController Integration Tests', () => {
  let app: Express;
  let server: AppServer;
  let database: FileDatabase;
  let testDbPath: string;
  let adminUser: User;
  let editorUser: User;
  let viewerUser: User;
  let testTopicId: string;

  beforeAll(async () => {
    // Create temporary database for testing
    testDbPath = path.join(
      __dirname,
      `resource_integration_test_db_${Date.now()}.json`
    );
    database = new FileDatabase(testDbPath);
    await database.initialize();

    // Initialize server with test database
    app = express();
    server = new AppServer(app);
    await server.initialize();

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

    // Mock authentication middleware
    app.use((req, _res, next) => {
      if (req.headers.authorization === 'Bearer admin-token') {
        req.user = adminUser;
      } else if (req.headers.authorization === 'Bearer editor-token') {
        req.user = editorUser;
      } else if (req.headers.authorization === 'Bearer viewer-token') {
        req.user = viewerUser;
      }
      next();
    });

    // Create a test topic for resource association
    const topicResponse = await request(app)
      .post('/topics')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Resource Test Topic',
        content: 'Topic for resource testing',
      });

    testTopicId = topicResponse.body.data.id;
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

  describe('POST /resources', () => {
    it('should create resource successfully with admin user', async () => {
      const resourceData = {
        topicId: testTopicId,
        url: 'https://example.com/test-resource',
        description: 'Test resource for integration testing',
        type: ResourceType.ARTICLE,
      };

      const response = await request(app)
        .post('/resources')
        .set('Authorization', 'Bearer admin-token')
        .send(resourceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.url).toBe(resourceData.url);
      expect(response.body.data.description).toBe(resourceData.description);
      expect(response.body.data.type).toBe(resourceData.type);
      expect(response.body.data.topicId).toBe(testTopicId);
      expect(response.body.data.id).toBeDefined();
    });

    it('should create resource successfully with editor user', async () => {
      const resourceData = {
        topicId: testTopicId,
        url: 'https://example.com/editor-resource',
        description: 'Resource created by editor',
        type: ResourceType.VIDEO,
      };

      const response = await request(app)
        .post('/resources')
        .set('Authorization', 'Bearer editor-token')
        .send(resourceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(ResourceType.VIDEO);
    });

    it('should reject resource creation for viewer user', async () => {
      const resourceData = {
        topicId: testTopicId,
        url: 'https://example.com/viewer-resource',
        description: 'This should fail',
        type: ResourceType.ARTICLE,
      };

      const response = await request(app)
        .post('/resources')
        .set('Authorization', 'Bearer viewer-token')
        .send(resourceData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should reject resource creation without authentication', async () => {
      const resourceData = {
        topicId: testTopicId,
        url: 'https://example.com/unauth-resource',
        description: 'This should fail',
        type: ResourceType.ARTICLE,
      };

      const response = await request(app)
        .post('/resources')
        .send(resourceData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        topicId: testTopicId,
        description: 'Missing URL field',
        type: ResourceType.ARTICLE,
      };

      const response = await request(app)
        .post('/resources')
        .set('Authorization', 'Bearer admin-token')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('url');
    });

    it('should validate resource type', async () => {
      const invalidData = {
        topicId: testTopicId,
        url: 'https://example.com/invalid-type',
        description: 'Invalid type resource',
        type: 'invalid-type',
      };

      const response = await request(app)
        .post('/resources')
        .set('Authorization', 'Bearer admin-token')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid resource type');
    });

    it('should validate topic exists', async () => {
      const resourceData = {
        topicId: 'non-existent-topic-id',
        url: 'https://example.com/orphan-resource',
        description: 'Resource with invalid topic',
        type: ResourceType.ARTICLE,
      };

      const response = await request(app)
        .post('/resources')
        .set('Authorization', 'Bearer admin-token')
        .send(resourceData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Topic');
    });

    it('should prevent duplicate URLs for same topic', async () => {
      const resourceData = {
        topicId: testTopicId,
        url: 'https://example.com/duplicate-url',
        description: 'First resource',
        type: ResourceType.ARTICLE,
      };

      // Create first resource
      await request(app)
        .post('/resources')
        .set('Authorization', 'Bearer admin-token')
        .send(resourceData)
        .expect(201);

      // Try to create duplicate
      const duplicateData = {
        ...resourceData,
        description: 'Duplicate resource',
      };

      const response = await request(app)
        .post('/resources')
        .set('Authorization', 'Bearer admin-token')
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /resources/:id', () => {
    let testResourceId: string;

    beforeAll(async () => {
      // Create a test resource
      const resourceData = {
        topicId: testTopicId,
        url: 'https://example.com/get-test-resource',
        description: 'Resource for GET testing',
        type: ResourceType.PDF,
      };

      const response = await request(app)
        .post('/resources')
        .set('Authorization', 'Bearer admin-token')
        .send(resourceData);

      testResourceId = response.body.data.id;
    });

    it('should retrieve resource successfully', async () => {
      const response = await request(app)
        .get(`/resources/${testResourceId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testResourceId);
      expect(response.body.data.type).toBe(ResourceType.PDF);
    });

    it('should allow viewer to read resources', async () => {
      const response = await request(app)
        .get(`/resources/${testResourceId}`)
        .set('Authorization', 'Bearer viewer-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testResourceId);
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await request(app)
        .get('/resources/non-existent-id')
        .set('Authorization', 'Bearer admin-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/resources/${testResourceId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /resources/:id', () => {
    let testResourceId: string;

    beforeEach(async () => {
      // Create a fresh test resource for each update test
      const resourceData = {
        topicId: testTopicId,
        url: 'https://example.com/update-test-resource',
        description: 'Resource for update testing',
        type: ResourceType.ARTICLE,
      };

      const response = await request(app)
        .post('/resources')
        .set('Authorization', 'Bearer admin-token')
        .send(resourceData);

      testResourceId = response.body.data.id;
    });

    it('should update resource successfully with admin user', async () => {
      const updateData = {
        url: 'https://example.com/updated-resource',
        description: 'Updated description',
        type: ResourceType.VIDEO,
      };

      const response = await request(app)
        .put(`/resources/${testResourceId}`)
        .set('Authorization', 'Bearer admin-token')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.url).toBe(updateData.url);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.type).toBe(updateData.type);
    });

    it('should update resource successfully with editor user', async () => {
      const updateData = {
        description: 'Editor updated description',
      };

      const response = await request(app)
        .put(`/resources/${testResourceId}`)
        .set('Authorization', 'Bearer editor-token')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should reject update for viewer user', async () => {
      const updateData = {
        description: 'Viewer update attempt',
      };

      const response = await request(app)
        .put(`/resources/${testResourceId}`)
        .set('Authorization', 'Bearer viewer-token')
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent resource', async () => {
      const updateData = {
        description: 'Update non-existent',
      };

      const response = await request(app)
        .put('/resources/non-existent-id')
        .set('Authorization', 'Bearer admin-token')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /resources/:id', () => {
    let testResourceId: string;

    beforeEach(async () => {
      // Create a fresh test resource for each delete test
      const resourceData = {
        topicId: testTopicId,
        url: 'https://example.com/delete-test-resource',
        description: 'Resource for delete testing',
        type: ResourceType.DOCUMENT,
      };

      const response = await request(app)
        .post('/resources')
        .set('Authorization', 'Bearer admin-token')
        .send(resourceData);

      testResourceId = response.body.data.id;
    });

    it('should delete resource successfully with admin user', async () => {
      const response = await request(app)
        .delete(`/resources/${testResourceId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify resource is deleted
      await request(app)
        .get(`/resources/${testResourceId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });

    it('should reject delete for editor user', async () => {
      const response = await request(app)
        .delete(`/resources/${testResourceId}`)
        .set('Authorization', 'Bearer editor-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject delete for viewer user', async () => {
      const response = await request(app)
        .delete(`/resources/${testResourceId}`)
        .set('Authorization', 'Bearer viewer-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await request(app)
        .delete('/resources/non-existent-id')
        .set('Authorization', 'Bearer admin-token')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /topics/:id/resources', () => {
    let topicWithResourcesId: string;
    let resource1Id: string;
    let resource2Id: string;

    beforeAll(async () => {
      // Create a topic for resource association testing
      const topicResponse = await request(app)
        .post('/topics')
        .set('Authorization', 'Bearer admin-token')
        .send({
          name: 'Topic with Resources',
          content: 'This topic will have multiple resources',
        });

      topicWithResourcesId = topicResponse.body.data.id;

      // Create multiple resources for this topic
      const resource1Response = await request(app)
        .post('/resources')
        .set('Authorization', 'Bearer admin-token')
        .send({
          topicId: topicWithResourcesId,
          url: 'https://example.com/resource-1',
          description: 'First resource',
          type: ResourceType.ARTICLE,
        });

      const resource2Response = await request(app)
        .post('/resources')
        .set('Authorization', 'Bearer admin-token')
        .send({
          topicId: topicWithResourcesId,
          url: 'https://example.com/resource-2',
          description: 'Second resource',
          type: ResourceType.VIDEO,
        });

      resource1Id = resource1Response.body.data.id;
      resource2Id = resource2Response.body.data.id;
    });

    it('should retrieve all resources for a topic', async () => {
      const response = await request(app)
        .get(`/topics/${topicWithResourcesId}/resources`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resources).toHaveLength(2);

      const resourceIds = response.body.data.resources.map((r: any) => r.id);
      expect(resourceIds).toContain(resource1Id);
      expect(resourceIds).toContain(resource2Id);
    });

    it('should allow viewer to read topic resources', async () => {
      const response = await request(app)
        .get(`/topics/${topicWithResourcesId}/resources`)
        .set('Authorization', 'Bearer viewer-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resources).toHaveLength(2);
    });

    it('should return empty array for topic with no resources', async () => {
      const response = await request(app)
        .get(`/topics/${testTopicId}/resources`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resources).toHaveLength(0);
    });

    it('should return 404 for non-existent topic', async () => {
      const response = await request(app)
        .get('/topics/non-existent-topic/resources')
        .set('Authorization', 'Bearer admin-token')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /resources/search', () => {
    beforeAll(async () => {
      // Create searchable resources
      await request(app)
        .post('/resources')
        .set('Authorization', 'Bearer admin-token')
        .send({
          topicId: testTopicId,
          url: 'https://example.com/searchable-1',
          description: 'This resource contains searchable content',
          type: ResourceType.ARTICLE,
        });

      await request(app)
        .post('/resources')
        .set('Authorization', 'Bearer admin-token')
        .send({
          topicId: testTopicId,
          url: 'https://example.com/searchable-2',
          description: 'Another resource with searchable information',
          type: ResourceType.VIDEO,
        });
    });

    it('should search resources successfully', async () => {
      const response = await request(app)
        .get('/resources/search?q=searchable')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resources.length).toBeGreaterThan(0);
      expect(response.body.data.searchTerm).toBe('searchable');
    });

    it('should filter by resource type', async () => {
      const response = await request(app)
        .get(`/resources/search?q=searchable&type=${ResourceType.VIDEO}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resources.length).toBeGreaterThan(0);
      expect(response.body.data.filterType).toBe(ResourceType.VIDEO);

      // All returned resources should be videos
      response.body.data.resources.forEach((resource: any) => {
        expect(resource.type).toBe(ResourceType.VIDEO);
      });
    });

    it('should require search query parameter', async () => {
      const response = await request(app)
        .get('/resources/search')
        .set('Authorization', 'Bearer admin-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('search term');
    });

    it('should allow viewer to search', async () => {
      const response = await request(app)
        .get('/resources/search?q=resource')
        .set('Authorization', 'Bearer viewer-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /resources/recent', () => {
    it('should retrieve recent resources', async () => {
      const response = await request(app)
        .get('/resources/recent?limit=5')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resources).toBeDefined();
      expect(response.body.data.resources.length).toBeLessThanOrEqual(5);
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/resources/recent?limit=0')
        .set('Authorization', 'Bearer admin-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('limit');
    });

    it('should use default limit when not specified', async () => {
      const response = await request(app)
        .get('/resources/recent')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resources).toBeDefined();
    });

    it('should allow viewer to access recent resources', async () => {
      const response = await request(app)
        .get('/resources/recent')
        .set('Authorization', 'Bearer viewer-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
