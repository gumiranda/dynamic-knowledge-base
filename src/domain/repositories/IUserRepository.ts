import { IRepository } from './IRepository';
import { User } from '../entities/User';
import { UserRole } from '../enums/UserRole';

/**
 * Repository interface for User entities with role management support
 */
export interface IUserRepository extends IRepository<User> {
  /**
   * Finds a user by email address
   * @param email The email address
   * @returns Promise resolving to the user or null if not found
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Finds users by role
   * @param role The user role
   * @returns Promise resolving to array of users with the specified role
   */
  findByRole(role: UserRole): Promise<User[]>;

  /**
   * Finds users by name (case-insensitive partial match)
   * @param name The name to search for
   * @returns Promise resolving to array of users with matching names
   */
  findByName(name: string): Promise<User[]>;

  /**
   * Checks if a user with the given email already exists
   * @param email The email address
   * @returns Promise resolving to true if user exists
   */
  existsByEmail(email: string): Promise<boolean>;

  /**
   * Checks if a user with the given email exists (excluding a specific user ID)
   * @param email The email address
   * @param excludeUserId The user ID to exclude from the check
   * @returns Promise resolving to true if another user with the email exists
   */
  existsByEmailExcluding(
    email: string,
    excludeUserId: string
  ): Promise<boolean>;

  /**
   * Counts the number of users by role
   * @param role The user role
   * @returns Promise resolving to the count of users with that role
   */
  countByRole(role: UserRole): Promise<number>;

  /**
   * Finds users created within a date range
   * @param startDate The start date
   * @param endDate The end date
   * @returns Promise resolving to array of users created in the date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<User[]>;

  /**
   * Finds the most recently created users
   * @param limit The maximum number of users to return
   * @returns Promise resolving to array of most recent users
   */
  findMostRecent(limit: number): Promise<User[]>;

  /**
   * Finds all admin users
   * @returns Promise resolving to array of admin users
   */
  findAdmins(): Promise<User[]>;

  /**
   * Finds all editor users (including admins)
   * @returns Promise resolving to array of users who can edit
   */
  findEditors(): Promise<User[]>;

  /**
   * Finds all viewer-only users
   * @returns Promise resolving to array of viewer-only users
   */
  findViewers(): Promise<User[]>;

  /**
   * Updates a user's role
   * @param userId The user ID
   * @param newRole The new role
   * @returns Promise resolving to the updated user or null if not found
   */
  updateRole(userId: string, newRole: UserRole): Promise<User | null>;

  /**
   * Validates that at least one admin user exists in the system
   * @returns Promise resolving to true if at least one admin exists
   */
  hasAdminUser(): Promise<boolean>;

  /**
   * Gets the total count of all users
   * @returns Promise resolving to the total user count
   */
  getTotalCount(): Promise<number>;
}
