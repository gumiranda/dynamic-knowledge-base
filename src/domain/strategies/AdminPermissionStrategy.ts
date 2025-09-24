import { IPermissionStrategy } from './IPermissionStrategy';
import { User } from '../entities/User';
import { UserRole } from '../enums/UserRole';

/**
 * Permission strategy for Admin users
 * Admins have full access to all operations (read, write, delete)
 */
export class AdminPermissionStrategy implements IPermissionStrategy {
  /**
   * Admins can read any resource
   * @param user The user requesting access
   * @param _resource The resource being accessed
   * @returns Always true for admins
   */
  canRead(user: User): boolean {
    return user.role === UserRole.ADMIN;
  }

  /**
   * Admins can write/modify any resource
   * @param user The user requesting access
   * @param _resource The resource being modified
   * @returns Always true for admins
   */
  canWrite(user: User): boolean {
    return user.role === UserRole.ADMIN;
  }

  /**
   * Admins can delete any resource
   * @param user The user requesting access
   * @param _resource The resource being deleted
   * @returns Always true for admins
   */
  canDelete(user: User): boolean {
    return user.role === UserRole.ADMIN;
  }

  /**
   * Gets the role name this strategy applies to
   * @returns The admin role name
   */
  getRoleName(): string {
    return UserRole.ADMIN;
  }
}
