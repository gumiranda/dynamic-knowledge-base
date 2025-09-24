import request from 'supertest';
import { Express } from 'express';
import { AppServer } from '../../../server/AppServer';
import { FileDatabase } from '../../../database/FileDatabase';
import { User } from '../../../../domain/entities/User';
import { UserRole } from '../../../../domain/enums/UserRole';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('PathController Integration Tests', () => {
  let app: Express;
  let server: AppServer;
  let database: FileDatabase;
  let testDbPath: string;
  let adminUser: User;
  let editorUser: User;
  let viewerUser: User;
  let topicAId: string;
  let topicBId: string;
  let topicCId: string;
  let isolatedTopicId: string;

  beforeAll(async () => {
    // Create temporary database for testing
    testDbPath = path.join(
      __dirname,
      `path_integration_test_db_${Date.now()}.json`
    );
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

    // Mock authentication middleware
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

    // Create test topic hierarchy: A -> B -> C, and isolated topic
    const topicAResponse = await request(app)
      .post('/topics')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Topic A',
        content: 'Root topic for path testing',
      });
    topicAId = topicAResponse.body.data.id;

    const topicBResponse = await request(app)
      .post('/topics')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Topic B',
        content: 'Child of Topic A',
        parentTopicId: topicAId,
      });
    topicBId = topicBResponse.body.data.id;

    const topicCResponse = await request(app)
      .post('/topics')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Topic C',
        content: 'Child of Topic B',
        parentTopicId: topicBId,
      });
    topicCId = topicCResponse.body.data.id;

    const isolatedTopicResponse = await request(app)
      .post('/topics')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Isolated Topic',
        content: 'This topic has no connections',
      });
    isolatedTopicId = isolatedTopicResponse.body.data.id;
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

  describe('GET /topics/:startId/path/:endId', () => {
    it('should find shortest path between connected topics', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/path/${topicCId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.path).toHaveLength(3);
      expect(response.body.data.path[0].id).toBe(topicAId);
      expect(response.body.data.path[1].id).toBe(topicBId);
      expect(response.body.data.path[2].id).toBe(topicCId);
      expect(response.body.data.distance).toBe(2);
      expect(response.body.data.connected).toBe(true);
    });

    it('should find path in reverse direction', async () => {
      const response = await request(app)
        .get(`/topics/${topicCId}/path/${topicAId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.path).toHaveLength(3);
      expect(response.body.data.path[0].id).toBe(topicCId);
      expect(response.body.data.path[1].id).toBe(topicBId);
      expect(response.body.data.path[2].id).toBe(topicAId);
    });

    it('should return same topic when start equals end', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/path/${topicAId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.path).toHaveLength(1);
      expect(response.body.data.path[0].id).toBe(topicAId);
      expect(response.body.data.distance).toBe(0);
      expect(response.body.data.connected).toBe(true);
    });

    it('should return no path for disconnected topics', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/path/${isolatedTopicId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.path).toHaveLength(0);
      expect(response.body.data.distance).toBe(-1);
      expect(response.body.data.connected).toBe(false);
      expect(response.body.message).toContain('No path found');
    });

    it('should allow viewer to find paths', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/path/${topicBId}`)
        .set('Authorization', 'Bearer viewer-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.path).toHaveLength(2);
    });

    it('should allow editor to find paths', async () => {
      const response = await request(app)
        .get(`/topics/${topicBId}/path/${topicCId}`)
        .set('Authorization', 'Bearer editor-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.path).toHaveLength(2);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/path/${topicBId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should validate topic IDs are provided', async () => {
      const response = await request(app)
        .get('/topics//path/topic-b')
        .set('Authorization', 'Bearer admin-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should validate topic IDs are not empty', async () => {
      const response = await request(app)
        .get('/topics/ /path/ ')
        .set('Authorization', 'Bearer admin-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('empty');
    });

    it('should return 404 for non-existent start topic', async () => {
      const response = await request(app)
        .get(`/topics/non-existent-start/path/${topicBId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Start topic');
    });

    it('should return 404 for non-existent end topic', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/path/non-existent-end`)
        .set('Authorization', 'Bearer admin-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('End topic');
    });
  });

  describe('GET /topics/:topicId/connected/:otherTopicId', () => {
    it('should check if topics are connected', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/connected/${topicCId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.connected).toBe(true);
      expect(response.body.data.topicId1).toBe(topicAId);
      expect(response.body.data.topicId2).toBe(topicCId);
    });

    it('should detect disconnected topics', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/connected/${isolatedTopicId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.connected).toBe(false);
    });

    it('should allow viewer to check connectivity', async () => {
      const response = await request(app)
        .get(`/topics/${topicBId}/connected/${topicCId}`)
        .set('Authorization', 'Bearer viewer-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.connected).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/connected/${topicBId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /topics/:topicId/distance/:otherTopicId', () => {
    it('should calculate distance between connected topics', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/distance/${topicCId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.distance).toBe(2);
      expect(response.body.data.topicId1).toBe(topicAId);
      expect(response.body.data.topicId2).toBe(topicCId);
    });

    it('should return 0 distance for same topic', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/distance/${topicAId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.distance).toBe(0);
    });

    it('should return -1 for disconnected topics', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/distance/${isolatedTopicId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.distance).toBe(-1);
    });

    it('should allow viewer to check distance', async () => {
      const response = await request(app)
        .get(`/topics/${topicBId}/distance/${topicCId}`)
        .set('Authorization', 'Bearer viewer-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.distance).toBe(1);
    });
  });

  describe('GET /topics/:topicId/nearby', () => {
    it('should find topics within specified distance', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/nearby?distance=1`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.topics).toHaveLength(2); // A and B
      expect(response.body.data.centerTopicId).toBe(topicAId);
      expect(response.body.data.maxDistance).toBe(1);

      const topicIds = response.body.data.topics.map((t: any) => t.id);
      expect(topicIds).toContain(topicAId);
      expect(topicIds).toContain(topicBId);
      expect(topicIds).not.toContain(topicCId); // Too far
    });

    it('should find topics within larger distance', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/nearby?distance=2`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.topics).toHaveLength(3); // A, B, and C

      const topicIds = response.body.data.topics.map((t: any) => t.id);
      expect(topicIds).toContain(topicAId);
      expect(topicIds).toContain(topicBId);
      expect(topicIds).toContain(topicCId);
    });

    it('should return only center topic for distance 0', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/nearby?distance=0`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.topics).toHaveLength(1);
      expect(response.body.data.topics[0].id).toBe(topicAId);
    });

    it('should use default distance when not specified', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/nearby`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.maxDistance).toBeDefined();
    });

    it('should validate negative distance', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/nearby?distance=-1`)
        .set('Authorization', 'Bearer admin-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('non-negative');
    });

    it('should return 404 for non-existent center topic', async () => {
      const response = await request(app)
        .get('/topics/non-existent-topic/nearby?distance=1')
        .set('Authorization', 'Bearer admin-token')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should allow viewer to find nearby topics', async () => {
      const response = await request(app)
        .get(`/topics/${topicBId}/nearby?distance=1`)
        .set('Authorization', 'Bearer viewer-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /graph/connectivity', () => {
    it('should analyze graph connectivity', async () => {
      const response = await request(app)
        .get('/graph/connectivity')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isFullyConnected).toBe(false); // Due to isolated topic
      expect(response.body.data.componentCount).toBe(2); // Connected component + isolated
      expect(response.body.data.isolatedTopics).toContain(isolatedTopicId);
    });

    it('should allow viewer to analyze connectivity', async () => {
      const response = await request(app)
        .get('/graph/connectivity')
        .set('Authorization', 'Bearer viewer-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/graph/connectivity')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle path finding with performance constraints', async () => {
      // Test with maximum depth parameter
      const response = await request(app)
        .get(`/topics/${topicAId}/path/${topicCId}?maxDepth=1`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should not find path due to depth constraint
      expect(response.body.data.path).toHaveLength(0);
    });

    it('should handle caching behavior', async () => {
      // First request
      const response1 = await request(app)
        .get(`/topics/${topicAId}/path/${topicBId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      // Second request (should use cache)
      const response2 = await request(app)
        .get(`/topics/${topicAId}/path/${topicBId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response1.body.data.path).toEqual(response2.body.data.path);
    });

    it('should handle bidirectional search', async () => {
      const response = await request(app)
        .get(`/topics/${topicAId}/path/${topicCId}?bidirectional=true`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.path).toHaveLength(3);
    });
  });
});
