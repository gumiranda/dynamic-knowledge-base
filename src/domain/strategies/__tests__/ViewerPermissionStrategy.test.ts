import { ViewerPermissionStrategy } from '../ViewerPermissionStrategy';
import { User } from '../../entities/User';
import { UserRole } from '../../enums/UserRole';

describe('ViewerPermissionStrategy', () => {
  let strategy: ViewerPermissionStrategy;
  let adminUser: User;
  let editorUser: User;
  let viewerUser: User;

  beforeEach(() => {
    strategy = new ViewerPermissionStrategy();

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

  describe('canRead', () => {
    it('should return true for viewer users', () => {
      expect(strategy.canRead(viewerUser)).toBe(true);
    });

    it('should return false for non-viewer users', () => {
      expect(strategy.canRead(adminUser)).toBe(false);
      expect(strategy.canRead(editorUser)).toBe(false);
    });

    it('should return true for viewer users with any resource', () => {
      const mockResource = { id: '1', name: 'Test Resource' };
      expect(strategy.canRead(viewerUser, mockResource)).toBe(true);
    });

    it('should return false for non-viewer users with any resource', () => {
      const mockResource = { id: '1', name: 'Test Resource' };
      expect(strategy.canRead(adminUser, mockResource)).toBe(false);
      expect(strategy.canRead(editorUser, mockResource)).toBe(false);
    });
  });

  describe('canWrite', () => {
    it('should return false for all users including viewers', () => {
      expect(strategy.canWrite(viewerUser)).toBe(false);
      expect(strategy.canWrite(adminUser)).toBe(false);
      expect(strategy.canWrite(editorUser)).toBe(false);
    });

    it('should return false for all users with any resource', () => {
      const mockResource = { id: '1', name: 'Test Resource' };
      expect(strategy.canWrite(viewerUser, mockResource)).toBe(false);
      expect(strategy.canWrite(adminUser, mockResource)).toBe(false);
      expect(strategy.canWrite(editorUser, mockResource)).toBe(false);
    });
  });

  describe('canDelete', () => {
    it('should return false for all users including viewers', () => {
      expect(strategy.canDelete(viewerUser)).toBe(false);
      expect(strategy.canDelete(adminUser)).toBe(false);
      expect(strategy.canDelete(editorUser)).toBe(false);
    });

    it('should return false for all users with any resource', () => {
      const mockResource = { id: '1', name: 'Test Resource' };
      expect(strategy.canDelete(viewerUser, mockResource)).toBe(false);
      expect(strategy.canDelete(adminUser, mockResource)).toBe(false);
      expect(strategy.canDelete(editorUser, mockResource)).toBe(false);
    });
  });

  describe('getRoleName', () => {
    it('should return the correct role name', () => {
      expect(strategy.getRoleName()).toBe(UserRole.VIEWER);
    });
  });
});
