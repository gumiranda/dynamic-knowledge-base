import { EditorPermissionStrategy } from '../EditorPermissionStrategy';
import { User } from '../../entities/User';
import { UserRole } from '../../enums/UserRole';

describe('EditorPermissionStrategy', () => {
  let strategy: EditorPermissionStrategy;
  let adminUser: User;
  let editorUser: User;
  let viewerUser: User;

  beforeEach(() => {
    strategy = new EditorPermissionStrategy();

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
    it('should return true for editor users', () => {
      expect(strategy.canRead(editorUser)).toBe(true);
    });

    it('should return false for non-editor users', () => {
      expect(strategy.canRead(adminUser)).toBe(false);
      expect(strategy.canRead(viewerUser)).toBe(false);
    });

    it('should return true for editor users with any resource', () => {
      const mockResource = { id: '1', name: 'Test Resource' };
      expect(strategy.canRead(editorUser)).toBe(true);
    });

    it('should return false for non-editor users with any resource', () => {
      const mockResource = { id: '1', name: 'Test Resource' };
      expect(strategy.canRead(adminUser)).toBe(false);
      expect(strategy.canRead(viewerUser)).toBe(false);
    });
  });

  describe('canWrite', () => {
    it('should return true for editor users', () => {
      expect(strategy.canWrite(editorUser)).toBe(true);
    });

    it('should return false for non-editor users', () => {
      expect(strategy.canWrite(adminUser)).toBe(false);
      expect(strategy.canWrite(viewerUser)).toBe(false);
    });

    it('should return true for editor users with any resource', () => {
      expect(strategy.canWrite(editorUser)).toBe(true);
    });

    it('should return false for non-editor users with any resource', () => {
      expect(strategy.canWrite(adminUser)).toBe(false);
      expect(strategy.canWrite(viewerUser)).toBe(false);
    });
  });

  describe('canDelete', () => {
    it('should return false for all users including editors', () => {
      expect(strategy.canDelete(editorUser)).toBe(false);
      expect(strategy.canDelete(adminUser)).toBe(false);
      expect(strategy.canDelete(viewerUser)).toBe(false);
    });

    it('should return false for all users with any resource', () => {
      const mockResource = { id: '1', name: 'Test Resource' };
      expect(strategy.canDelete(editorUser, mockResource)).toBe(false);
      expect(strategy.canDelete(adminUser, mockResource)).toBe(false);
      expect(strategy.canDelete(viewerUser, mockResource)).toBe(false);
    });
  });

  describe('getRoleName', () => {
    it('should return the correct role name', () => {
      expect(strategy.getRoleName()).toBe(UserRole.EDITOR);
    });
  });
});
