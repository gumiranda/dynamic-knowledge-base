import { IPermissionStrategy } from './IPermissionStrategy';
import { User } from '../entities/User';
import { UserRole } from '../enums/UserRole';

/**
 * Permission strategy for Viewer users
 * Viewers can only read resources, no write or delete permissions
 */
export class ViewerPermissionStrategy implements IPermissionStrategy {
  /**
   * Viewers can read resources
   * @param user The user requesting access
   * @param _resource The resource being accessed
   * @returns True if user is a viewer
   */
  canRead(user: User, _resource?: any): boolean {
    return user.role === UserRole.VIEWER;
  }

  /**
   * Viewers cannot write/modify resources
   * @param _user The user requesting access
   * @param _resource The resource being modified
   * @returns Always false for viewers
   */
  canWrite(_user: User, _resource?: any): boolean {
    return false;
  }

  /**
   * Viewers cannot delete resources
   * @param _user The user requesting access
   * @param _resource The resource being deleted
   * @returns Always false for viewers
   */
  canDelete(_user: User, _resource?: any): boolean {
    return false;
  }

  /**
   * Gets the role name this strategy applies to
   * @returns The viewer role name
   */
  getRoleName(): string {
    return UserRole.VIEWER;
  }
}
