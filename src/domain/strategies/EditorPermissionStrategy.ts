import { IPermissionStrategy } from './IPermissionStrategy';
import { User } from '../entities/User';
import { UserRole } from '../enums/UserRole';

/**
 * Permission strategy for Editor users
 * Editors can read and write resources but cannot delete them
 */
export class EditorPermissionStrategy implements IPermissionStrategy {
  /**
   * Editors can read any resource
   * @param user The user requesting access
   * @param _resource The resource being accessed
   * @returns True if user is an editor
   */
  canRead(user: User): boolean {
    return user.role === UserRole.EDITOR;
  }

  /**
   * Editors can write/modify resources
   * @param user The user requesting access
   * @param _resource The resource being modified
   * @returns True if user is an editor
   */
  canWrite(user: User): boolean {
    return user.role === UserRole.EDITOR;
  }

  /**
   * Editors cannot delete resources
   * @param _user The user requesting access
   * @param _resource The resource being deleted
   * @returns Always false for editors
   */
  canDelete(): boolean {
    return false;
  }

  /**
   * Gets the role name this strategy applies to
   * @returns The editor role name
   */
  getRoleName(): string {
    return UserRole.EDITOR;
  }
}
