import { IPermissionStrategy } from './IPermissionStrategy';
import { AdminPermissionStrategy } from './AdminPermissionStrategy';
import { EditorPermissionStrategy } from './EditorPermissionStrategy';
import { ViewerPermissionStrategy } from './ViewerPermissionStrategy';
import { User } from '../entities/User';
import { UserRole } from '../enums/UserRole';

/**
 * Context class for permission strategies
 * Implements the Strategy pattern by selecting the appropriate permission strategy
 * based on the user's role and delegating permission checks to that strategy
 */
export class PermissionContext {
  private strategy: IPermissionStrategy;

  /**
   * Creates a new PermissionContext with the appropriate strategy for the user's role
   * @param user The user whose permissions need to be checked
   */
  constructor(user: User) {
    this.strategy = this.getStrategyForRole(user.role);
  }

  /**
   * Checks if the user can read a resource
   * @param user The user requesting access
   * @param resource The resource being accessed
   * @returns True if user has read permission
   */
  canRead(user: User, resource?: any): boolean {
    return this.strategy.canRead(user, resource);
  }

  /**
   * Checks if the user can write/modify a resource
   * @param user The user requesting access
   * @param resource The resource being modified
   * @returns True if user has write permission
   */
  canWrite(user: User, resource?: any): boolean {
    return this.strategy.canWrite(user, resource);
  }

  /**
   * Checks if the user can delete a resource
   * @param user The user requesting access
   * @param resource The resource being deleted
   * @returns True if user has delete permission
   */
  canDelete(user: User, resource?: any): boolean {
    return this.strategy.canDelete(user, resource);
  }

  /**
   * Gets the current strategy's role name
   * @returns The role name
   */
  getStrategyRoleName(): string {
    return this.strategy.getRoleName();
  }

  /**
   * Updates the strategy based on a new user
   * @param user The new user to set strategy for
   */
  updateStrategy(user: User): void {
    this.strategy = this.getStrategyForRole(user.role);
  }

  /**
   * Gets the appropriate permission strategy for a user role
   * @param role The user role
   * @returns The corresponding permission strategy
   * @throws Error if role is not recognized
   */
  private getStrategyForRole(role: UserRole): IPermissionStrategy {
    switch (role) {
      case UserRole.ADMIN:
        return new AdminPermissionStrategy();
      case UserRole.EDITOR:
        return new EditorPermissionStrategy();
      case UserRole.VIEWER:
        return new ViewerPermissionStrategy();
      default:
        throw new Error(`Unsupported user role: ${role}`);
    }
  }

  /**
   * Creates a permission context for a specific user
   * Static factory method for convenience
   * @param user The user to create context for
   * @returns New PermissionContext instance
   */
  static forUser(user: User): PermissionContext {
    return new PermissionContext(user);
  }
}
