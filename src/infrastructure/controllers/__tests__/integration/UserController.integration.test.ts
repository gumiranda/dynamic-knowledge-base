import request from 'supertest';
import express, { Express } from 'express';
import { AppServer } from '../../../server/AppServer';
import { FileDatabase } from '../../../database/FileDatabase';
import { User } from '../../../../domain/entities/User';
import { UserRole } from '../../../../domain/enums/UserRole';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('UserController Integration Tests', () => {
  let app: Express;
  let server: AppServer;
  let database: FileDatabase;
  let testDbPath: string;
  let adminUser: User;
  let editorUser: User;
  let viewerUser: User;

  beforeAll(async () => {
    // Create temporary database for testing
    testDbPath = path.join(
      __dirname,
      `user_integration_test_db_${Date.now()}.json`
    );
    database = new FileDatabase(testDbPath);
    await database.initialize();

    // Initialize Express app and server
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
  describe('POST /users', () => {
    it('should register user successfully by admin', async () => {
      const userData = {
        name: 'New Test User',
        email: 'newuser@test.com',
        role: UserRole.EDITOR,
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', 'Bearer admin-token')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(userData.name);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.role).toBe(userData.role);
      expect(response.body.data.id).toBeDefined();
    });

    it('should allow self-registration', async () => {
      const userData = {
        name: 'Self Registered User',
        email: 'selfregistered@test.com',
        role: UserRole.VIEWER,
      };

      const response = await request(app)
        .post('/users')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe(UserRole.VIEWER);
    });

    it('should reject admin role registration by non-admin', async () => {
      const userData = {
        name: 'Attempted Admin',
        email: 'attemptedadmin@test.com',
        role: UserRole.ADMIN,
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', 'Bearer editor-token')
        .send(userData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'incomplete@test.com',
        role: UserRole.VIEWER,
        // Missing name
      };

      const response = await request(app)
        .post('/users')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('name');
    });

    it('should validate email format', async () => {
      const invalidData = {
        name: 'Invalid Email User',
        email: 'invalid-email',
        role: UserRole.VIEWER,
      };

      const response = await request(app)
        .post('/users')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should prevent duplicate email registration', async () => {
      const userData = {
        name: 'Duplicate Email User',
        email: 'duplicate@test.com',
        role: UserRole.VIEWER,
      };

      // First registration
      await request(app).post('/users').send(userData).expect(201);

      // Attempt duplicate
      const duplicateData = {
        ...userData,
        name: 'Another User',
      };

      const response = await request(app)
        .post('/users')
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /users/authenticate', () => {
    let testUserEmail: string;

    beforeAll(async () => {
      // Create a user for authentication testing
      const userData = {
        name: 'Auth Test User',
        email: 'authtest@test.com',
        role: UserRole.EDITOR,
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', 'Bearer admin-token')
        .send(userData);

      testUserEmail = response.body.data.email;
    });

    it('should authenticate user successfully', async () => {
      const authData = {
        email: testUserEmail,
      };

      const response = await request(app)
        .post('/users/authenticate')
        .send(authData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUserEmail);
    });

    it('should return null for non-existent user', async () => {
      const authData = {
        email: 'nonexistent@test.com',
      };

      const response = await request(app)
        .post('/users/authenticate')
        .send(authData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should validate email field', async () => {
      const invalidData = {};

      const response = await request(app)
        .post('/users/authenticate')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });
  });

  describe('GET /users/:id', () => {
    let testUserId: string;

    beforeAll(async () => {
      // Create a user for retrieval testing
      const userData = {
        name: 'Get Test User',
        email: 'gettest@test.com',
        role: UserRole.EDITOR,
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', 'Bearer admin-token')
        .send(userData);

      testUserId = response.body.data.id;
    });

    it('should retrieve user successfully by admin', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUserId);
    });

    it('should allow editor to read user info', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', 'Bearer editor-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject viewer access', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', 'Bearer viewer-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/users/non-existent-id')
        .set('Authorization', 'Bearer admin-token')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /users/:id', () => {
    let testUserId: string;

    beforeEach(async () => {
      // Create a fresh user for each update test
      const userData = {
        name: 'Update Test User',
        email: `updatetest${Date.now()}@test.com`,
        role: UserRole.EDITOR,
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', 'Bearer admin-token')
        .send(userData);

      testUserId = response.body.data.id;
    });

    it('should update user successfully by admin', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@test.com',
      };

      const response = await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', 'Bearer admin-token')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.email).toBe(updateData.email);
    });

    it('should allow user to update themselves', async () => {
      // Mock the user updating themselves
      app.use((req, _res, next) => {
        if (req.headers.authorization === 'Bearer self-token') {
          req.user = new User({ ...editorUser, id: testUserId } as any);
        }
        next();
      });

      const updateData = {
        name: 'Self Updated Name',
      };

      const response = await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', 'Bearer self-token')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should reject role updates by non-admin', async () => {
      const updateData = {
        role: UserRole.ADMIN,
      };

      const response = await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', 'Bearer editor-token')
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should prevent admin self-demotion', async () => {
      // Mock admin updating themselves
      app.use((req, _res, next) => {
        if (req.headers.authorization === 'Bearer admin-self-token') {
          req.user = new User({ ...adminUser, id: testUserId } as any);
        }
        next();
      });

      const updateData = {
        role: UserRole.EDITOR,
      };

      const response = await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', 'Bearer admin-self-token')
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('demote themselves');
    });

    it('should return 404 for non-existent user', async () => {
      const updateData = {
        name: 'Update Non-existent',
      };

      const response = await request(app)
        .put('/users/non-existent-id')
        .set('Authorization', 'Bearer admin-token')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /users', () => {
    it('should retrieve all users for admin', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);
    });

    it('should reject access for non-admin', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', 'Bearer editor-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/users').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /users/search', () => {
    beforeAll(async () => {
      // Create searchable users
      await request(app)
        .post('/users')
        .set('Authorization', 'Bearer admin-token')
        .send({
          name: 'Searchable User One',
          email: 'searchable1@test.com',
          role: UserRole.EDITOR,
        });

      await request(app)
        .post('/users')
        .set('Authorization', 'Bearer admin-token')
        .send({
          name: 'Another Searchable User',
          email: 'searchable2@test.com',
          role: UserRole.VIEWER,
        });
    });

    it('should search users successfully by admin', async () => {
      const response = await request(app)
        .get('/users/search?q=searchable')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThan(0);
      expect(response.body.data.searchTerm).toBe('searchable');
    });

    it('should filter by role', async () => {
      const response = await request(app)
        .get(`/users/search?q=searchable&role=${UserRole.VIEWER}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.roleFilter).toBe(UserRole.VIEWER);

      // All returned users should be viewers
      response.body.data.users.forEach((user: any) => {
        expect(user.role).toBe(UserRole.VIEWER);
      });
    });

    it('should reject access for non-admin', async () => {
      const response = await request(app)
        .get('/users/search?q=test')
        .set('Authorization', 'Bearer editor-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should require search query parameter', async () => {
      const response = await request(app)
        .get('/users/search')
        .set('Authorization', 'Bearer admin-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('search term');
    });
  });

  describe('POST /users/:id/assign-role', () => {
    let testUserId: string;

    beforeEach(async () => {
      // Create a user for role assignment testing
      const userData = {
        name: 'Role Test User',
        email: `roletest${Date.now()}@test.com`,
        role: UserRole.VIEWER,
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', 'Bearer admin-token')
        .send(userData);

      testUserId = response.body.data.id;
    });

    it('should assign role successfully by admin', async () => {
      const roleData = {
        newRole: UserRole.EDITOR,
        assignedBy: adminUser.id,
      };

      const response = await request(app)
        .post(`/users/${testUserId}/assign-role`)
        .set('Authorization', 'Bearer admin-token')
        .send(roleData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe(UserRole.EDITOR);
    });

    it('should reject role assignment by non-admin', async () => {
      const roleData = {
        newRole: UserRole.ADMIN,
        assignedBy: editorUser.id,
      };

      const response = await request(app)
        .post(`/users/${testUserId}/assign-role`)
        .set('Authorization', 'Bearer editor-token')
        .send(roleData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const roleData = {
        newRole: UserRole.EDITOR,
        assignedBy: adminUser.id,
      };

      const response = await request(app)
        .post('/users/non-existent-id/assign-role')
        .set('Authorization', 'Bearer admin-token')
        .send(roleData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /users/:id', () => {
    let testUserId: string;

    beforeEach(async () => {
      // Create a user for deletion testing
      const userData = {
        name: 'Delete Test User',
        email: `deletetest${Date.now()}@test.com`,
        role: UserRole.EDITOR,
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', 'Bearer admin-token')
        .send(userData);

      testUserId = response.body.data.id;
    });

    it('should delete user successfully by admin', async () => {
      const response = await request(app)
        .delete(`/users/${testUserId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify user is deleted
      await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });

    it('should reject deletion by non-admin', async () => {
      const response = await request(app)
        .delete(`/users/${testUserId}`)
        .set('Authorization', 'Bearer editor-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should prevent admin self-deletion', async () => {
      // Mock admin deleting themselves
      app.use((req, _res, next) => {
        if (req.headers.authorization === 'Bearer admin-self-delete-token') {
          req.user = new User({ ...adminUser, id: testUserId } as any);
        }
        next();
      });

      const response = await request(app)
        .delete(`/users/${testUserId}`)
        .set('Authorization', 'Bearer admin-self-delete-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('delete themselves');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .delete('/users/non-existent-id')
        .set('Authorization', 'Bearer admin-token')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /users/stats', () => {
    it('should retrieve user statistics for admin', async () => {
      const response = await request(app)
        .get('/users/stats')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalUsers).toBeDefined();
      expect(response.body.data.adminCount).toBeDefined();
      expect(response.body.data.editorCount).toBeDefined();
      expect(response.body.data.viewerCount).toBeDefined();
      expect(response.body.data.recentRegistrations).toBeDefined();
    });

    it('should reject access for non-admin', async () => {
      const response = await request(app)
        .get('/users/stats')
        .set('Authorization', 'Bearer editor-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
