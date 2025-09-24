import { User } from '../entities/User';

/**
 * Interface defining permission strategy for different user roles
 * Implements the Strategy pattern for role-based access control
 */
export interface IPermissionStrategy {
  /**
   * Determines if a user can read a resource
   * @param user The user requesting access
   * @param resource The resource being accessed (can be any entity)
   * @returns True if user has read permission
   */
  canRead(user: User, resource?: any): boolean;

  /**
   * Determines if a user can write/modify a resource
   * @param user The user requesting access
   * @param resource The resource being modified (can be any entity)
   * @returns True if user has write permission
   */
  canWrite(user: User, resource?: any): boolean;

  /**
   * Determines if a user can delete a resource
   * @param user The user requesting access
   * @param resource The resource being deleted (can be any entity)
   * @returns True if user has delete permission
   */
  canDelete(user: User, resource?: any): boolean;

  /**
   * Gets the role name this strategy applies to
   * @returns The role name
   */
  getRoleName(): string;
}
