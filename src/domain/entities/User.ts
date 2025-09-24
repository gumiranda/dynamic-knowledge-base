import { BaseEntity } from './BaseEntity';
import { UserRole, UserRoleUtils } from '../enums/UserRole';
import { EntityUtils } from '../utils/EntityUtils';
import bcrypt from 'bcryptjs';

/**
 * User entity representing a system user with role-based permissions
 */
export class User extends BaseEntity {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // Optional for backward compatibility, hashed password
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    name: string;
    email: string;
    role: UserRole;
    password?: string;
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super();

    this.id = data.id || EntityUtils.generateId();
    this.name = data.name;
    this.email = data.email;
    this.role = data.role;
    this.password = data.password;
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
   * Hashes a plain text password
   * @param plainPassword The plain text password to hash
   * @returns Promise resolving to the hashed password
   */
  static async hashPassword(plainPassword: string): Promise<string> {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (plainPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    if (plainPassword.length >= 72) {
      throw new Error('Password must be less than 72 characters (bcrypt limitation)');
    }

    const saltRounds = 10;
    return bcrypt.hash(plainPassword, saltRounds);
  }

  /**
   * Verifies a plain text password against the hashed password
   * @param plainPassword The plain text password to verify
   * @returns Promise resolving to true if password matches
   */
  async verifyPassword(plainPassword: string): Promise<boolean> {
    if (!this.password) {
      return false;
    }

    if (!plainPassword || typeof plainPassword !== 'string') {
      return false;
    }

    return bcrypt.compare(plainPassword, this.password);
  }

  /**
   * Updates the user's password with proper hashing
   * @param newPassword The new plain text password
   */
  async updatePassword(newPassword: string): Promise<void> {
    if (!newPassword || typeof newPassword !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    if (newPassword.length >= 72) {
      throw new Error('Password must be less than 72 characters (bcrypt limitation)');
    }

    this.password = await User.hashPassword(newPassword);
    this.updateTimestamp();
  }

  /**
   * Checks if the user has a password set
   * @returns True if user has a password
   */
  hasPassword(): boolean {
    return !!this.password;
  }

  /**
   * Creates a safe representation of the user (without sensitive data)
   * @returns User object without sensitive information (password excluded)
   */
  toSafeObject(): Omit<User, 'updateTimestamp' | 'password'> {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      hasPassword: this.hasPassword.bind(this),
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
      verifyPassword: this.verifyPassword.bind(this),
      updatePassword: this.updatePassword.bind(this),
    };
  }
}
