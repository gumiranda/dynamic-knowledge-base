import { PermissionContext } from '../PermissionContext';
import { User } from '../../entities/User';
import { UserRole } from '../../enums/UserRole';

describe('PermissionContext', () => {
  let adminUser: User;
  let editorUser: User;
  let viewerUser: User;

  beforeEach(() => {
    adminUser = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    });

    editorUser = new User({
      name: 'Editor User',
      email: 'editor@example.com',
      role: UserRole.EDITOR,
    });

    viewerUser = new User({
      name: 'Viewer User',
      email: 'viewer@example.com',
      role: UserRole.VIEWER,
    });
  });

  describe('constructor', () => {
    it('should create context with admin strategy for admin user', () => {
      const context = new PermissionContext(adminUser);
      expect(context.getStrategyRoleName()).toBe(UserRole.ADMIN);
    });

    it('should create context with editor strategy for editor user', () => {
      const context = new PermissionContext(editorUser);
      expect(context.getStrategyRoleName()).toBe(UserRole.EDITOR);
    });

    it('should create context with viewer strategy for viewer user', () => {
      const context = new PermissionContext(viewerUser);
      expect(context.getStrategyRoleName()).toBe(UserRole.VIEWER);
    });

    it('should throw error for invalid user role', () => {
      const invalidUser = new User({
        name: 'Invalid User',
        email: 'invalid@example.com',
        role: 'InvalidRole' as UserRole,
      });

      expect(() => new PermissionContext(invalidUser)).toThrow(
        'Unsupported user role: InvalidRole'
      );
    });
  });

  describe('forUser static method', () => {
    it('should create context using static factory method', () => {
      const context = PermissionContext.forUser(adminUser);
      expect(context.getStrategyRoleName()).toBe(UserRole.ADMIN);
    });
  });

  describe('Admin permissions', () => {
    let context: PermissionContext;

    beforeEach(() => {
      context = new PermissionContext(adminUser);
    });

    it('should allow all operations for admin users', () => {
      expect(context.canRead(adminUser)).toBe(true);
      expect(context.canWrite(adminUser)).toBe(true);
      expect(context.canDelete(adminUser)).toBe(true);
    });

    it('should allow all operations for admin users with resources', () => {
      const mockResource = { id: '1', name: 'Test Resource' };
      expect(context.canRead(adminUser, mockResource)).toBe(true);
      expect(context.canWrite(adminUser, mockResource)).toBe(true);
      expect(context.canDelete(adminUser, mockResource)).toBe(true);
    });

    it('should deny operations for non-admin users when using admin context', () => {
      expect(context.canRead(editorUser)).toBe(false);
      expect(context.canWrite(editorUser)).toBe(false);
      expect(context.canDelete(editorUser)).toBe(false);
    });
  });

  describe('Editor permissions', () => {
    let context: PermissionContext;

    beforeEach(() => {
      context = new PermissionContext(editorUser);
    });

    it('should allow read and write but not delete for editor users', () => {
      expect(context.canRead(editorUser)).toBe(true);
      expect(context.canWrite(editorUser)).toBe(true);
      expect(context.canDelete(editorUser)).toBe(false);
    });

    it('should allow read and write but not delete for editor users with resources', () => {
      const mockResource = { id: '1', name: 'Test Resource' };
      expect(context.canRead(editorUser, mockResource)).toBe(true);
      expect(context.canWrite(editorUser, mockResource)).toBe(true);
      expect(context.canDelete(editorUser, mockResource)).toBe(false);
    });

    it('should deny operations for non-editor users when using editor context', () => {
      expect(context.canRead(adminUser)).toBe(false);
      expect(context.canWrite(adminUser)).toBe(false);
      expect(context.canDelete(adminUser)).toBe(false);
    });
  });

  describe('Viewer permissions', () => {
    let context: PermissionContext;

    beforeEach(() => {
      context = new PermissionContext(viewerUser);
    });

    it('should allow only read for viewer users', () => {
      expect(context.canRead(viewerUser)).toBe(true);
      expect(context.canWrite(viewerUser)).toBe(false);
      expect(context.canDelete(viewerUser)).toBe(false);
    });

    it('should allow only read for viewer users with resources', () => {
      const mockResource = { id: '1', name: 'Test Resource' };
      expect(context.canRead(viewerUser, mockResource)).toBe(true);
      expect(context.canWrite(viewerUser, mockResource)).toBe(false);
      expect(context.canDelete(viewerUser, mockResource)).toBe(false);
    });

    it('should deny operations for non-viewer users when using viewer context', () => {
      expect(context.canRead(adminUser)).toBe(false);
      expect(context.canWrite(adminUser)).toBe(false);
      expect(context.canDelete(adminUser)).toBe(false);
    });
  });

  describe('updateStrategy', () => {
    it('should update strategy when user role changes', () => {
      const context = new PermissionContext(viewerUser);
      expect(context.getStrategyRoleName()).toBe(UserRole.VIEWER);

      context.updateStrategy(adminUser);
      expect(context.getStrategyRoleName()).toBe(UserRole.ADMIN);

      context.updateStrategy(editorUser);
      expect(context.getStrategyRoleName()).toBe(UserRole.EDITOR);
    });

    it('should update permissions correctly after strategy change', () => {
      const context = new PermissionContext(viewerUser);

      // Initially viewer permissions
      expect(context.canRead(viewerUser)).toBe(true);
      expect(context.canWrite(viewerUser)).toBe(false);
      expect(context.canDelete(viewerUser)).toBe(false);

      // Update to admin strategy
      context.updateStrategy(adminUser);
      expect(context.canRead(adminUser)).toBe(true);
      expect(context.canWrite(adminUser)).toBe(true);
      expect(context.canDelete(adminUser)).toBe(true);

      // Update to editor strategy
      context.updateStrategy(editorUser);
      expect(context.canRead(editorUser)).toBe(true);
      expect(context.canWrite(editorUser)).toBe(true);
      expect(context.canDelete(editorUser)).toBe(false);
    });
  });

  describe('cross-role permission validation', () => {
    it('should demonstrate proper role-based access control', () => {
      const adminContext = new PermissionContext(adminUser);
      const editorContext = new PermissionContext(editorUser);
      const viewerContext = new PermissionContext(viewerUser);

      // Admin can do everything
      expect(adminContext.canRead(adminUser)).toBe(true);
      expect(adminContext.canWrite(adminUser)).toBe(true);
      expect(adminContext.canDelete(adminUser)).toBe(true);

      // Editor can read and write but not delete
      expect(editorContext.canRead(editorUser)).toBe(true);
      expect(editorContext.canWrite(editorUser)).toBe(true);
      expect(editorContext.canDelete(editorUser)).toBe(false);

      // Viewer can only read
      expect(viewerContext.canRead(viewerUser)).toBe(true);
      expect(viewerContext.canWrite(viewerUser)).toBe(false);
      expect(viewerContext.canDelete(viewerUser)).toBe(false);
    });
  });
});
