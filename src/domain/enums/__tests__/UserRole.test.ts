import { UserRole, UserRoleUtils } from '../UserRole';

describe('UserRole', () => {
  describe('enum values', () => {
    it('should have correct enum values', () => {
      expect(UserRole.ADMIN).toBe('Admin');
      expect(UserRole.EDITOR).toBe('Editor');
      expect(UserRole.VIEWER).toBe('Viewer');
    });
  });
});

describe('UserRoleUtils', () => {
  describe('getAllRoles', () => {
    it('should return all user roles', () => {
      const roles = UserRoleUtils.getAllRoles();
      expect(roles).toHaveLength(3);
      expect(roles).toContain(UserRole.ADMIN);
      expect(roles).toContain(UserRole.EDITOR);
      expect(roles).toContain(UserRole.VIEWER);
    });
  });

  describe('isValidRole', () => {
    it('should return true for valid roles', () => {
      expect(UserRoleUtils.isValidRole('Admin')).toBe(true);
      expect(UserRoleUtils.isValidRole('Editor')).toBe(true);
      expect(UserRoleUtils.isValidRole('Viewer')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(UserRoleUtils.isValidRole('InvalidRole')).toBe(false);
      expect(UserRoleUtils.isValidRole('admin')).toBe(false); // case sensitive
      expect(UserRoleUtils.isValidRole('')).toBe(false);
      expect(UserRoleUtils.isValidRole('SuperAdmin')).toBe(false);
    });
  });

  describe('getRoleHierarchy', () => {
    it('should return correct hierarchy levels', () => {
      expect(UserRoleUtils.getRoleHierarchy(UserRole.VIEWER)).toBe(1);
      expect(UserRoleUtils.getRoleHierarchy(UserRole.EDITOR)).toBe(2);
      expect(UserRoleUtils.getRoleHierarchy(UserRole.ADMIN)).toBe(3);
    });

    it('should have admin as highest hierarchy', () => {
      const adminLevel = UserRoleUtils.getRoleHierarchy(UserRole.ADMIN);
      const editorLevel = UserRoleUtils.getRoleHierarchy(UserRole.EDITOR);
      const viewerLevel = UserRoleUtils.getRoleHierarchy(UserRole.VIEWER);

      expect(adminLevel).toBeGreaterThan(editorLevel);
      expect(editorLevel).toBeGreaterThan(viewerLevel);
    });
  });

  describe('hasEqualOrHigherPermissions', () => {
    it('should return true when role1 has higher permissions', () => {
      expect(
        UserRoleUtils.hasEqualOrHigherPermissions(
          UserRole.ADMIN,
          UserRole.EDITOR
        )
      ).toBe(true);
      expect(
        UserRoleUtils.hasEqualOrHigherPermissions(
          UserRole.ADMIN,
          UserRole.VIEWER
        )
      ).toBe(true);
      expect(
        UserRoleUtils.hasEqualOrHigherPermissions(
          UserRole.EDITOR,
          UserRole.VIEWER
        )
      ).toBe(true);
    });

    it('should return true when roles are equal', () => {
      expect(
        UserRoleUtils.hasEqualOrHigherPermissions(
          UserRole.ADMIN,
          UserRole.ADMIN
        )
      ).toBe(true);
      expect(
        UserRoleUtils.hasEqualOrHigherPermissions(
          UserRole.EDITOR,
          UserRole.EDITOR
        )
      ).toBe(true);
      expect(
        UserRoleUtils.hasEqualOrHigherPermissions(
          UserRole.VIEWER,
          UserRole.VIEWER
        )
      ).toBe(true);
    });

    it('should return false when role1 has lower permissions', () => {
      expect(
        UserRoleUtils.hasEqualOrHigherPermissions(
          UserRole.VIEWER,
          UserRole.EDITOR
        )
      ).toBe(false);
      expect(
        UserRoleUtils.hasEqualOrHigherPermissions(
          UserRole.VIEWER,
          UserRole.ADMIN
        )
      ).toBe(false);
      expect(
        UserRoleUtils.hasEqualOrHigherPermissions(
          UserRole.EDITOR,
          UserRole.ADMIN
        )
      ).toBe(false);
    });
  });
});
