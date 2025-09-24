import { UserRepository } from '../UserRepository';
import { FileDatabase } from '../../database/FileDatabase';
import { User } from '../../../domain/entities/User';
import { UserRole } from '../../../domain/enums/UserRole';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('UserRepository', () => {
  let repository: UserRepository;
  let database: FileDatabase;
  let testDbPath: string;

  beforeEach(async () => {
    // Create temporary database for testing
    testDbPath = path.join(__dirname, `test_db_${Date.now()}.json`);
    database = new FileDatabase(testDbPath);
    await database.initialize();
    repository = new UserRepository(database);
  });

  afterEach(async () => {
    // Clean up test database
    await database.close();
    try {
      await fs.unlink(testDbPath);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const user = new User({
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.EDITOR,
      });

      const createdUser = await repository.create(user);

      expect(createdUser.id).toBeDefined();
      expect(createdUser.name).toBe('John Doe');
      expect(createdUser.email).toBe('john@example.com');
      expect(createdUser.role).toBe(UserRole.EDITOR);
    });

    it('should throw error for invalid user', async () => {
      const user = new User({
        name: '', // Invalid empty name
        email: 'john@example.com',
        role: UserRole.EDITOR,
      });

      await expect(repository.create(user)).rejects.toThrow(
        'Invalid user data'
      );
    });

    it('should throw error for duplicate email', async () => {
      const user1 = new User({
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.EDITOR,
      });

      const user2 = new User({
        name: 'Jane Doe',
        email: 'john@example.com', // Same email
        role: UserRole.VIEWER,
      });

      await repository.create(user1);
      await expect(repository.create(user2)).rejects.toThrow(
        'User with email john@example.com already exists'
      );
    });

    it('should throw error for duplicate ID', async () => {
      const user1 = new User({
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.EDITOR,
        id: 'user_1',
      });

      const user2 = new User({
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: UserRole.VIEWER,
        id: 'user_1', // Same ID
      });

      await repository.create(user1);
      await expect(repository.create(user2)).rejects.toThrow(
        'User with ID user_1 already exists'
      );
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const user = new User({
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.EDITOR,
      });

      const createdUser = await repository.create(user);
      const foundUser = await repository.findById(createdUser.id);

      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.name).toBe('John Doe');
    });

    it('should return null for non-existent user', async () => {
      const foundUser = await repository.findById('non-existent');
      expect(foundUser).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const user = new User({
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.EDITOR,
      });

      await repository.create(user);
      const foundUser = await repository.findByEmail('john@example.com');

      expect(foundUser).not.toBeNull();
      expect(foundUser!.email).toBe('john@example.com');
      expect(foundUser!.name).toBe('John Doe');
    });

    it('should find user by email (case-insensitive)', async () => {
      const user = new User({
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.EDITOR,
      });

      await repository.create(user);
      const foundUser = await repository.findByEmail('JOHN@EXAMPLE.COM');

      expect(foundUser).not.toBeNull();
      expect(foundUser!.email).toBe('john@example.com');
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await repository.findByEmail('nonexistent@example.com');
      expect(foundUser).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const user = new User({
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.EDITOR,
      });

      const createdUser = await repository.create(user);
      const updatedUser = await repository.update(createdUser.id, {
        name: 'John Smith',
        email: 'johnsmith@example.com',
        role: UserRole.ADMIN,
      });

      expect(updatedUser.name).toBe('John Smith');
      expect(updatedUser.email).toBe('johnsmith@example.com');
      expect(updatedUser.role).toBe(UserRole.ADMIN);
      expect(updatedUser.id).toBe(createdUser.id);
    });

    it('should throw error for duplicate email', async () => {
      const user1 = new User({
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.EDITOR,
      });

      const user2 = new User({
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: UserRole.VIEWER,
      });

      const createdUser1 = await repository.create(user1);
      await repository.create(user2);

      await expect(
        repository.update(createdUser1.id, { email: 'jane@example.com' })
      ).rejects.toThrow('User with email jane@example.com already exists');
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        repository.update('non-existent', { name: 'Updated' })
      ).rejects.toThrow('User with ID non-existent not found');
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const user = new User({
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.EDITOR,
      });

      const createdUser = await repository.create(user);
      const deleted = await repository.delete(createdUser.id);

      expect(deleted).toBe(true);
      expect(await repository.findById(createdUser.id)).toBeNull();
    });

    it('should throw error when deleting last admin', async () => {
      const admin = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });

      const createdAdmin = await repository.create(admin);

      await expect(repository.delete(createdAdmin.id)).rejects.toThrow(
        'Cannot delete the last admin user'
      );
    });

    it('should allow deleting admin when other admins exist', async () => {
      const admin1 = new User({
        name: 'Admin One',
        email: 'admin1@example.com',
        role: UserRole.ADMIN,
      });

      const admin2 = new User({
        name: 'Admin Two',
        email: 'admin2@example.com',
        role: UserRole.ADMIN,
      });

      const createdAdmin1 = await repository.create(admin1);
      await repository.create(admin2);

      const deleted = await repository.delete(createdAdmin1.id);
      expect(deleted).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      const deleted = await repository.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('findByRole', () => {
    it('should find users by role', async () => {
      const admin = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });

      const editor1 = new User({
        name: 'Editor One',
        email: 'editor1@example.com',
        role: UserRole.EDITOR,
      });

      const editor2 = new User({
        name: 'Editor Two',
        email: 'editor2@example.com',
        role: UserRole.EDITOR,
      });

      const viewer = new User({
        name: 'Viewer User',
        email: 'viewer@example.com',
        role: UserRole.VIEWER,
      });

      await repository.create(admin);
      await repository.create(editor1);
      await repository.create(editor2);
      await repository.create(viewer);

      const editors = await repository.findByRole(UserRole.EDITOR);

      expect(editors).toHaveLength(2);
      expect(editors.map((u) => u.name)).toContain('Editor One');
      expect(editors.map((u) => u.name)).toContain('Editor Two');
    });
  });

  describe('findByName', () => {
    it('should find users by name (case-insensitive)', async () => {
      const user1 = new User({
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.EDITOR,
      });

      const user2 = new User({
        name: 'John Smith',
        email: 'johnsmith@example.com',
        role: UserRole.VIEWER,
      });

      const user3 = new User({
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: UserRole.ADMIN,
      });

      await repository.create(user1);
      await repository.create(user2);
      await repository.create(user3);

      const johnUsers = await repository.findByName('john');

      expect(johnUsers).toHaveLength(2);
      expect(johnUsers.map((u) => u.name)).toContain('John Doe');
      expect(johnUsers.map((u) => u.name)).toContain('John Smith');
    });
  });

  describe('existsByEmail', () => {
    it('should check if user exists by email', async () => {
      const user = new User({
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.EDITOR,
      });

      await repository.create(user);

      const exists = await repository.existsByEmail('john@example.com');
      const notExists = await repository.existsByEmail('other@example.com');

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });

  describe('countByRole', () => {
    it('should count users by role', async () => {
      const admin = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });

      const editor1 = new User({
        name: 'Editor One',
        email: 'editor1@example.com',
        role: UserRole.EDITOR,
      });

      const editor2 = new User({
        name: 'Editor Two',
        email: 'editor2@example.com',
        role: UserRole.EDITOR,
      });

      await repository.create(admin);
      await repository.create(editor1);
      await repository.create(editor2);

      const adminCount = await repository.countByRole(UserRole.ADMIN);
      const editorCount = await repository.countByRole(UserRole.EDITOR);
      const viewerCount = await repository.countByRole(UserRole.VIEWER);

      expect(adminCount).toBe(1);
      expect(editorCount).toBe(2);
      expect(viewerCount).toBe(0);
    });
  });

  describe('updateRole', () => {
    it('should update user role', async () => {
      const user = new User({
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.EDITOR,
      });

      const createdUser = await repository.create(user);
      const updatedUser = await repository.updateRole(
        createdUser.id,
        UserRole.ADMIN
      );

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.role).toBe(UserRole.ADMIN);
    });

    it('should throw error when removing last admin role', async () => {
      const admin = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });

      const createdAdmin = await repository.create(admin);

      await expect(
        repository.updateRole(createdAdmin.id, UserRole.EDITOR)
      ).rejects.toThrow('Cannot remove admin role from the last admin user');
    });

    it('should return null for non-existent user', async () => {
      const result = await repository.updateRole(
        'non-existent',
        UserRole.ADMIN
      );
      expect(result).toBeNull();
    });
  });

  describe('hasAdminUser', () => {
    it('should return true when admin user exists', async () => {
      const admin = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });

      await repository.create(admin);

      const hasAdmin = await repository.hasAdminUser();
      expect(hasAdmin).toBe(true);
    });

    it('should return false when no admin user exists', async () => {
      const editor = new User({
        name: 'Editor User',
        email: 'editor@example.com',
        role: UserRole.EDITOR,
      });

      await repository.create(editor);

      const hasAdmin = await repository.hasAdminUser();
      expect(hasAdmin).toBe(false);
    });
  });

  describe('findEditors', () => {
    it('should find all users who can edit (editors and admins)', async () => {
      const admin = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });

      const editor = new User({
        name: 'Editor User',
        email: 'editor@example.com',
        role: UserRole.EDITOR,
      });

      const viewer = new User({
        name: 'Viewer User',
        email: 'viewer@example.com',
        role: UserRole.VIEWER,
      });

      await repository.create(admin);
      await repository.create(editor);
      await repository.create(viewer);

      const editors = await repository.findEditors();

      expect(editors).toHaveLength(2);
      expect(editors.map((u) => u.name)).toContain('Admin User');
      expect(editors.map((u) => u.name)).toContain('Editor User');
    });
  });
});
