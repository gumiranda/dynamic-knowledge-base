import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { UserRole } from '../../domain/enums/UserRole';
import { FileDatabase } from '../database/FileDatabase';

/**
 * File-based implementation of IUserRepository with role management support
 */
export class UserRepository implements IUserRepository {
  constructor(private database: FileDatabase) {}

  /**
   * Finds a user by ID
   */
  async findById(id: string): Promise<User | null> {
    const data = await this.database.getData();
    const userData = data.users[id];

    if (!userData) {
      return null;
    }

    return this.deserializeUser(userData);
  }

  /**
   * Finds all users
   */
  async findAll(): Promise<User[]> {
    const data = await this.database.getData();
    const users: User[] = [];

    for (const userData of Object.values(data.users)) {
      users.push(this.deserializeUser(userData));
    }

    return users.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Creates a new user
   */
  async create(entity: User): Promise<User> {
    return await this.database.transaction(async (data) => {
      // Generate new ID if not provided
      if (!entity.id) {
        data.metadata.lastUserId++;
        entity.id = `user_${data.metadata.lastUserId}`;
      }

      // Check if user already exists
      if (data.users[entity.id]) {
        throw new Error(`User with ID ${entity.id} already exists`);
      }

      // Check if email already exists
      for (const existingUser of Object.values(data.users)) {
        if (existingUser.email.toLowerCase() === entity.email.toLowerCase()) {
          throw new Error(`User with email ${entity.email} already exists`);
        }
      }

      // Validate entity
      if (!entity.isValid()) {
        throw new Error('Invalid user data');
      }

      // Store user
      data.users[entity.id] = this.serializeUser(entity);

      return entity;
    });
  }

  /**
   * Updates a user
   */
  async update(id: string, updates: Partial<User>): Promise<User> {
    return await this.database.transaction(async (data) => {
      const userData = data.users[id];

      if (!userData) {
        throw new Error(`User with ID ${id} not found`);
      }

      // Get current user
      const currentUser = this.deserializeUser(userData);

      // Check email uniqueness if email is being updated
      if (
        updates.email &&
        updates.email.toLowerCase() !== currentUser.email.toLowerCase()
      ) {
        for (const [userId, existingUser] of Object.entries(data.users)) {
          if (
            userId !== id &&
            existingUser.email.toLowerCase() === updates.email.toLowerCase()
          ) {
            throw new Error(`User with email ${updates.email} already exists`);
          }
        }
      }

      // Create updated user
      const updatedUser = new User({
        ...currentUser,
        ...updates,
        id: currentUser.id, // Preserve original ID
        updatedAt: new Date(),
      });

      // Validate updated user
      if (!updatedUser.isValid()) {
        throw new Error('Invalid updated user data');
      }

      // Update user
      data.users[id] = this.serializeUser(updatedUser);

      return updatedUser;
    });
  }

  /**
   * Deletes a user
   */
  async delete(id: string): Promise<boolean> {
    return await this.database.transaction(async (data) => {
      if (!data.users[id]) {
        return false;
      }

      // Check if this is the last admin user
      const userToDelete = data.users[id];
      if (userToDelete.role === UserRole.ADMIN) {
        const adminCount = Object.values(data.users).filter(
          (user) => user.role === UserRole.ADMIN
        ).length;

        if (adminCount <= 1) {
          throw new Error('Cannot delete the last admin user');
        }
      }

      delete data.users[id];
      return true;
    });
  }

  /**
   * Finds a user by email address
   */
  async findByEmail(email: string): Promise<User | null> {
    const data = await this.database.getData();
    const normalizedEmail = email.toLowerCase();

    for (const userData of Object.values(data.users)) {
      if (userData.email.toLowerCase() === normalizedEmail) {
        return this.deserializeUser(userData);
      }
    }

    return null;
  }

  /**
   * Finds users by role
   */
  async findByRole(role: UserRole): Promise<User[]> {
    const data = await this.database.getData();
    const users: User[] = [];

    for (const userData of Object.values(data.users)) {
      if (userData.role === role) {
        users.push(this.deserializeUser(userData));
      }
    }

    return users.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Finds users by name (case-insensitive partial match)
   */
  async findByName(name: string): Promise<User[]> {
    const data = await this.database.getData();
    const users: User[] = [];
    const searchName = name.toLowerCase();

    for (const userData of Object.values(data.users)) {
      if (userData.name.toLowerCase().includes(searchName)) {
        users.push(this.deserializeUser(userData));
      }
    }

    return users.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Checks if a user with the given email already exists
   */
  async existsByEmail(email: string): Promise<boolean> {
    const data = await this.database.getData();
    const normalizedEmail = email.toLowerCase();

    for (const userData of Object.values(data.users)) {
      if (userData.email.toLowerCase() === normalizedEmail) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if a user with the given email exists (excluding a specific user ID)
   */
  async existsByEmailExcluding(
    email: string,
    excludeUserId: string
  ): Promise<boolean> {
    const data = await this.database.getData();
    const normalizedEmail = email.toLowerCase();

    for (const [userId, userData] of Object.entries(data.users)) {
      if (
        userId !== excludeUserId &&
        userData.email.toLowerCase() === normalizedEmail
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Counts the number of users by role
   */
  async countByRole(role: UserRole): Promise<number> {
    const data = await this.database.getData();
    let count = 0;

    for (const userData of Object.values(data.users)) {
      if (userData.role === role) {
        count++;
      }
    }

    return count;
  }

  /**
   * Finds users created within a date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<User[]> {
    const data = await this.database.getData();
    const users: User[] = [];

    for (const userData of Object.values(data.users)) {
      const createdAt = new Date(userData.createdAt);
      if (createdAt >= startDate && createdAt <= endDate) {
        users.push(this.deserializeUser(userData));
      }
    }

    return users.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Finds the most recently created users
   */
  async findMostRecent(limit: number): Promise<User[]> {
    const data = await this.database.getData();
    const users: User[] = [];

    for (const userData of Object.values(data.users)) {
      users.push(this.deserializeUser(userData));
    }

    return users
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Finds all admin users
   */
  async findAdmins(): Promise<User[]> {
    return this.findByRole(UserRole.ADMIN);
  }

  /**
   * Finds all editor users (including admins)
   */
  async findEditors(): Promise<User[]> {
    const data = await this.database.getData();
    const users: User[] = [];

    for (const userData of Object.values(data.users)) {
      if (
        userData.role === UserRole.EDITOR ||
        userData.role === UserRole.ADMIN
      ) {
        users.push(this.deserializeUser(userData));
      }
    }

    return users.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Finds all viewer-only users
   */
  async findViewers(): Promise<User[]> {
    return this.findByRole(UserRole.VIEWER);
  }

  /**
   * Updates a user's role
   */
  async updateRole(userId: string, newRole: UserRole): Promise<User | null> {
    return await this.database.transaction(async (data) => {
      const userData = data.users[userId];

      if (!userData) {
        return null;
      }

      // Check if this would remove the last admin
      if (userData.role === UserRole.ADMIN && newRole !== UserRole.ADMIN) {
        const adminCount = Object.values(data.users).filter(
          (user) => user.role === UserRole.ADMIN
        ).length;

        if (adminCount <= 1) {
          throw new Error('Cannot remove admin role from the last admin user');
        }
      }

      // Update role
      userData.role = newRole;
      userData.updatedAt = new Date();

      return this.deserializeUser(userData);
    });
  }

  /**
   * Validates that at least one admin user exists in the system
   */
  async hasAdminUser(): Promise<boolean> {
    const data = await this.database.getData();

    for (const userData of Object.values(data.users)) {
      if (userData.role === UserRole.ADMIN) {
        return true;
      }
    }

    return false;
  }

  /**
   * Gets the total count of all users
   */
  async getTotalCount(): Promise<number> {
    const data = await this.database.getData();
    return Object.keys(data.users).length;
  }

  /**
   * Serializes a User entity for storage
   */
  private serializeUser(user: User): any {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Deserializes stored data back to a User entity
   */
  private deserializeUser(data: any): User {
    return new User({
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });
  }
}
