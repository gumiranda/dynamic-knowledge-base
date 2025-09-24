import { BaseEntity } from './BaseEntity';
import { UserRole, UserRoleUtils } from '../enums/UserRole';
import { EntityUtils } from '../utils/EntityUtils';

/**
 * User entity representing a system user with role-based permissions
 */
export class User extends BaseEntity {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    name: string;
    email: string;
    role: UserRole;
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super();

    this.id = data.id || EntityUtils.generateId();
    this.name = data.name;
    this.email = data.email;
    this.role = data.role;
    this.createdAt = data.createdAt || EntityUtils.createTimestamp();
    this.updatedAt = data.updatedAt || EntityUtils.createTimestamp();
  }

  /**
   * Validates the user entity
   * @returns True if user is valid, false otherwise
   */
  isValid(): boolean {
    return (
      super.isValid() &&
      this.isValidName() &&
      this.isValidEmail() &&
      this.isValidRole()
    );
  }

  /**
   * Validates the user's name
   * @returns True if name is valid
   */
  isValidName(): boolean {
    return (
      typeof this.name === 'string' &&
      this.name.trim().length >= 2 &&
      this.name.trim().length <= 100 &&
      /^[a-zA-Z\s\-'\\.]+$/.test(this.name.trim())
    );
  }

  /**
   * Validates the user's email address
   * @returns True if email is valid
   */
  isValidEmail(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (
      typeof this.email === 'string' &&
      this.email.trim().length > 0 &&
      this.email.length <= 254 &&
      emailRegex.test(this.email.trim().toLowerCase())
    );
  }

  /**
   * Validates the user's role
   * @returns True if role is valid
   */
  isValidRole(): boolean {
    return UserRoleUtils.isValidRole(this.role);
  }

  /**
   * Updates the user's name
   * @param newName The new name
   */
  updateName(newName: string): void {
    if (!newName || typeof newName !== 'string') {
      throw new Error('Invalid name provided');
    }

    const trimmedName = newName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      throw new Error('Name must be between 2 and 100 characters');
    }

    if (!/^[a-zA-Z\s\-'\\.]+$/.test(trimmedName)) {
      throw new Error('Name contains invalid characters');
    }

    this.name = trimmedName;
    this.updateTimestamp();
  }

  /**
   * Updates the user's email
   * @param newEmail The new email address
   */
  updateEmail(newEmail: string): void {
    if (!newEmail || typeof newEmail !== 'string') {
      throw new Error('Invalid email provided');
    }

    const trimmedEmail = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Invalid email format');
    }

    if (trimmedEmail.length > 254) {
      throw new Error('Email address too long');
    }

    this.email = trimmedEmail;
    this.updateTimestamp();
  }

  /**
   * Updates the user's role
   * @param newRole The new role
   */
  updateRole(newRole: UserRole): void {
    if (!UserRoleUtils.isValidRole(newRole)) {
      throw new Error('Invalid role provided');
    }

    this.role = newRole;
    this.updateTimestamp();
  }

  /**
   * Checks if the user has admin privileges
   * @returns True if user is an admin
   */
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * Checks if the user has editor privileges or higher
   * @returns True if user is editor or admin
   */
  canEdit(): boolean {
    return this.role === UserRole.EDITOR || this.role === UserRole.ADMIN;
  }

  /**
   * Checks if the user can only view (no edit/admin privileges)
   * @returns True if user is viewer only
   */
  isViewerOnly(): boolean {
    return this.role === UserRole.VIEWER;
  }

  /**
   * Checks if this user has equal or higher permissions than another user
   * @param otherUser The user to compare against
   * @returns True if this user has >= permissions
   */
  hasEqualOrHigherPermissionsThan(otherUser: User): boolean {
    return UserRoleUtils.hasEqualOrHigherPermissions(this.role, otherUser.role);
  }

  /**
   * Gets the user's display name (formatted name)
   * @returns Formatted display name
   */
  getDisplayName(): string {
    return this.name.trim();
  }

  /**
   * Gets the user's role hierarchy level
   * @returns Numeric hierarchy level
   */
  getRoleHierarchy(): number {
    return UserRoleUtils.getRoleHierarchy(this.role);
  }

  /**
   * Creates a safe representation of the user (without sensitive data)
   * @returns User object without sensitive information
   */
  toSafeObject(): Omit<User, 'updateTimestamp'> {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isValid: this.isValid.bind(this),
      isValidName: this.isValidName.bind(this),
      isValidEmail: this.isValidEmail.bind(this),
      isValidRole: this.isValidRole.bind(this),
      updateName: this.updateName.bind(this),
      updateEmail: this.updateEmail.bind(this),
      updateRole: this.updateRole.bind(this),
      isAdmin: this.isAdmin.bind(this),
      canEdit: this.canEdit.bind(this),
      isViewerOnly: this.isViewerOnly.bind(this),
      hasEqualOrHigherPermissionsThan:
        this.hasEqualOrHigherPermissionsThan.bind(this),
      getDisplayName: this.getDisplayName.bind(this),
      getRoleHierarchy: this.getRoleHierarchy.bind(this),
      toSafeObject: this.toSafeObject.bind(this),
    };
  }
}
