/**
 * Enumeration of user roles in the system
 * Defines the different permission levels for users
 */
export enum UserRole {
  ADMIN = 'Admin',
  EDITOR = 'Editor',
  VIEWER = 'Viewer',
}

/**
 * Utility functions for UserRole enum
 */
export class UserRoleUtils {
  /**
   * Gets all available user roles
   * @returns Array of all UserRole values
   */
  static getAllRoles(): UserRole[] {
    return Object.values(UserRole);
  }

  /**
   * Checks if a string is a valid user role
   * @param role The role string to validate
   * @returns True if the role is valid
   */
  static isValidRole(role: string): role is UserRole {
    return Object.values(UserRole).includes(role as UserRole);
  }

  /**
   * Gets the hierarchy level of a role (higher number = more permissions)
   * @param role The user role
   * @returns Numeric hierarchy level
   */
  static getRoleHierarchy(role: UserRole): number {
    switch (role) {
      case UserRole.VIEWER:
        return 1;
      case UserRole.EDITOR:
        return 2;
      case UserRole.ADMIN:
        return 3;
      default:
        return 0;
    }
  }

  /**
   * Checks if one role has higher or equal permissions than another
   * @param role1 The role to check
   * @param role2 The role to compare against
   * @returns True if role1 has >= permissions than role2
   */
  static hasEqualOrHigherPermissions(
    role1: UserRole,
    role2: UserRole
  ): boolean {
    return this.getRoleHierarchy(role1) >= this.getRoleHierarchy(role2);
  }
}
