import { AdminPermissionStrategy } from '../AdminPermissionStrategy';
import { User } from '../../entities/User';
import { UserRole } from '../../enums/UserRole';

describe('AdminPermissionStrategy', () => {
  let strategy: AdminPermissionStrategy;
  let adminUser: User;
  let editorUser: User;
  let viewerUser: User;

  beforeEach(() => {
    strategy = new AdminPermissionStrategy();

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
    it('should return true for admin users', () => {
      expect(strategy.canRead(adminUser)).toBe(true);
    });

    it('should return false for non-admin users', () => {
      expect(strategy.canRead(editorUser)).toBe(false);
      expect(strategy.canRead(viewerUser)).toBe(false);
    });

    it('should return true for admin users with any resource', () => {
      expect(strategy.canRead(adminUser)).toBe(true);
    });

    it('should return false for non-admin users with any resource', () => {
      expect(strategy.canRead(editorUser)).toBe(false);
      expect(strategy.canRead(viewerUser)).toBe(false);
    });
  });

  describe('canWrite', () => {
    it('should return true for admin users', () => {
      expect(strategy.canWrite(adminUser)).toBe(true);
    });

    it('should return false for non-admin users', () => {
      expect(strategy.canWrite(editorUser)).toBe(false);
      expect(strategy.canWrite(viewerUser)).toBe(false);
    });

    it('should return true for admin users with any resource', () => {
      expect(strategy.canWrite(adminUser)).toBe(true);
    });

    it('should return false for non-admin users with any resource', () => {
      expect(strategy.canWrite(editorUser)).toBe(false);
      expect(strategy.canWrite(viewerUser)).toBe(false);
    });
  });

  describe('canDelete', () => {
    it('should return true for admin users', () => {
      expect(strategy.canDelete(adminUser)).toBe(true);
    });

    it('should return false for non-admin users', () => {
      expect(strategy.canDelete(editorUser)).toBe(false);
      expect(strategy.canDelete(viewerUser)).toBe(false);
    });

    it('should return true for admin users with any resource', () => {
      expect(strategy.canDelete(adminUser)).toBe(true);
    });

    it('should return false for non-admin users with any resource', () => {
      expect(strategy.canDelete(editorUser)).toBe(false);
      expect(strategy.canDelete(viewerUser)).toBe(false);
    });
  });

  describe('getRoleName', () => {
    it('should return the correct role name', () => {
      expect(strategy.getRoleName()).toBe(UserRole.ADMIN);
    });
  });
});
