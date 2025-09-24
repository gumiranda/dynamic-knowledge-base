import { User } from '../../domain/entities/User';
import { UserRole } from '../../domain/enums/UserRole';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { PermissionContext } from '../../domain/strategies/PermissionContext';
import {
  RegisterUserDto,
  UpdateUserDto,
  UserResponseDto,
  AuthenticateUserDto,
  UserSearchDto,
  AssignRoleDto,
  UserStatsDto,
} from '../dtos/UserDto';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '../errors/AppError';

/**
 * Service class for User business logic and operations
 * Implements user registration, authentication, role management, and validation
 */
export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Registers a new user with validation
   * @param userData The user registration data
   * @param registeredBy The user performing the registration (optional for self-registration)
   * @returns Promise resolving to the created user
   */
  async registerUser(
    userData: RegisterUserDto,
    registeredBy?: User
  ): Promise<UserResponseDto> {
    // Validate input data
    this.validateRegisterUserData(userData);

    // Check if user is registering themselves or if admin is registering someone
    if (registeredBy) {
      const permissionContext = new PermissionContext(registeredBy);
      if (!permissionContext.canWrite(registeredBy)) {
        throw new UnauthorizedError(
          'Insufficient permissions to register users'
        );
      }
    }

    // Check for email uniqueness
    const existingUser = await this.userRepository.findByEmail(
      userData.email.toLowerCase()
    );
    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    // Create user entity
    const user = new User({
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
      role: userData.role,
    });

    // Validate user entity
    if (!user.isValid()) {
      throw new ValidationError('Invalid user data provided');
    }

    // Save to repository
    const createdUser = await this.userRepository.create(user);

    return this.mapToResponseDto(createdUser);
  }

  /**
   * Authenticates a user by email
   * @param authData The authentication data
   * @returns Promise resolving to the authenticated user or null if not found
   */
  async authenticateUser(
    authData: AuthenticateUserDto
  ): Promise<UserResponseDto | null> {
    // Validate input
    if (!authData.email || typeof authData.email !== 'string') {
      throw new ValidationError('Email is required for authentication');
    }

    const email = authData.email.toLowerCase().trim();
    if (email.length === 0) {
      throw new ValidationError('Email cannot be empty');
    }

    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null;
    }

    return this.mapToResponseDto(user);
  }

  /**
   * Updates user information
   * @param id The user ID to update
   * @param updates The updates to apply
   * @param updatedBy The user performing the update
   * @returns Promise resolving to the updated user
   */
  async updateUser(
    id: string,
    updates: UpdateUserDto,
    updatedBy: User
  ): Promise<UserResponseDto> {
    // Find existing user
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    // Check permissions - users can update themselves, only admins can update others
    const isSelfUpdate = existingUser.id === updatedBy.id;

    if (!isSelfUpdate && !updatedBy.isAdmin()) {
      throw new UnauthorizedError('Only administrators can update other users');
    }

    // Validate update data
    this.validateUpdateUserData(updates);

    // Check email uniqueness if email is being updated
    if (updates.email && updates.email.toLowerCase() !== existingUser.email) {
      const existingWithEmail = await this.userRepository.findByEmail(
        updates.email.toLowerCase()
      );
      if (existingWithEmail) {
        throw new ConflictError('A user with this email already exists');
      }
    }

    // Role updates require admin permissions
    if (updates.role !== undefined && updates.role !== existingUser.role) {
      if (!updatedBy.isAdmin()) {
        throw new UnauthorizedError(
          'Only administrators can change user roles'
        );
      }

      // Prevent users from demoting themselves from admin
      if (
        isSelfUpdate &&
        existingUser.isAdmin() &&
        updates.role !== UserRole.ADMIN
      ) {
        throw new ValidationError('Administrators cannot demote themselves');
      }
    }

    // Apply updates
    if (updates.name !== undefined) {
      existingUser.updateName(updates.name);
    }
    if (updates.email !== undefined) {
      existingUser.updateEmail(updates.email);
    }
    if (updates.role !== undefined) {
      existingUser.updateRole(updates.role);
    }

    // Validate updated user
    if (!existingUser.isValid()) {
      throw new ValidationError('Invalid updated user data');
    }

    // Save updates
    const updatedUser = await this.userRepository.update(id, existingUser);

    return this.mapToResponseDto(updatedUser);
  }

  /**
   * Retrieves a user by ID
   * @param id The user ID
   * @param requestedBy The user requesting the information
   * @returns Promise resolving to the user or null if not found
   */
  async getUser(
    id: string,
    requestedBy: User
  ): Promise<UserResponseDto | null> {
    // Validate permissions
    const permissionContext = new PermissionContext(requestedBy);
    if (!permissionContext.canRead(requestedBy)) {
      throw new UnauthorizedError(
        'Insufficient permissions to read user information'
      );
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      return null;
    }

    return this.mapToResponseDto(user);
  }

  /**
   * Retrieves all users (admin only)
   * @param requestedBy The user requesting the list
   * @returns Promise resolving to array of users
   */
  async getAllUsers(requestedBy: User): Promise<UserResponseDto[]> {
    // Only admins can view all users
    if (!requestedBy.isAdmin()) {
      throw new UnauthorizedError('Only administrators can view all users');
    }

    const users = await this.userRepository.findAll();
    return users.map(this.mapToResponseDto);
  }

  /**
   * Searches users by name or email
   * @param searchTerm The term to search for
   * @param requestedBy The user performing the search
   * @param roleFilter Optional role filter
   * @returns Promise resolving to search results
   */
  async searchUsers(
    searchTerm: string,
    requestedBy: User,
    roleFilter?: UserRole
  ): Promise<UserSearchDto> {
    // Only admins can search users
    if (!requestedBy.isAdmin()) {
      throw new UnauthorizedError('Only administrators can search users');
    }

    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new ValidationError('Search term cannot be empty');
    }

    const trimmedTerm = searchTerm.trim();

    // Search by name (email search would need to be implemented differently)
    const nameResults = await this.userRepository.findByName(trimmedTerm);

    // For email search, we'll check if the search term is an exact email match
    let emailResults: User[] = [];
    if (trimmedTerm.includes('@')) {
      const emailUser = await this.userRepository.findByEmail(trimmedTerm);
      if (emailUser) {
        emailResults = [emailUser];
      }
    }

    // Combine and deduplicate results
    const allResults = [...nameResults, ...emailResults];
    const uniqueResults = allResults.filter(
      (user, index, array) => array.findIndex((u) => u.id === user.id) === index
    );

    // Apply role filter if specified
    let filteredResults = uniqueResults;
    if (roleFilter) {
      filteredResults = uniqueResults.filter(
        (user) => user.role === roleFilter
      );
    }

    return {
      users: filteredResults.map(this.mapToResponseDto),
      totalCount: filteredResults.length,
      searchTerm: trimmedTerm,
      roleFilter,
    };
  }

  /**
   * Assigns a role to a user (admin only)
   * @param assignmentData The role assignment data
   * @param assignedBy The admin performing the assignment
   * @returns Promise resolving to the updated user
   */
  async assignRole(
    assignmentData: AssignRoleDto,
    assignedBy: User
  ): Promise<UserResponseDto> {
    // Only admins can assign roles
    if (!assignedBy.isAdmin()) {
      throw new UnauthorizedError('Only administrators can assign roles');
    }

    // Find target user
    const targetUser = await this.userRepository.findById(
      assignmentData.userId
    );
    if (!targetUser) {
      throw new NotFoundError(
        `User with ID ${assignmentData.userId} not found`
      );
    }

    // Prevent self-demotion from admin
    if (
      targetUser.id === assignedBy.id &&
      targetUser.isAdmin() &&
      assignmentData.newRole !== UserRole.ADMIN
    ) {
      throw new ValidationError('Administrators cannot demote themselves');
    }

    // Validate new role
    if (!Object.values(UserRole).includes(assignmentData.newRole)) {
      throw new ValidationError('Invalid role specified');
    }

    // Update role
    targetUser.updateRole(assignmentData.newRole);

    // Save changes
    const updatedUser = await this.userRepository.update(
      assignmentData.userId,
      targetUser
    );

    return this.mapToResponseDto(updatedUser);
  }

  /**
   * Deletes a user (admin only)
   * @param id The user ID to delete
   * @param deletedBy The admin performing the deletion
   * @returns Promise resolving to true if deletion was successful
   */
  async deleteUser(id: string, deletedBy: User): Promise<boolean> {
    // Only admins can delete users
    if (!deletedBy.isAdmin()) {
      throw new UnauthorizedError('Only administrators can delete users');
    }

    // Find user to delete
    const userToDelete = await this.userRepository.findById(id);
    if (!userToDelete) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    // Prevent self-deletion
    if (userToDelete.id === deletedBy.id) {
      throw new ValidationError('Users cannot delete themselves');
    }

    // Perform deletion
    return await this.userRepository.delete(id);
  }

  /**
   * Gets user statistics (admin only)
   * @param requestedBy The admin requesting the statistics
   * @returns Promise resolving to user statistics
   */
  async getUserStats(requestedBy: User): Promise<UserStatsDto> {
    // Only admins can view user statistics
    if (!requestedBy.isAdmin()) {
      throw new UnauthorizedError(
        'Only administrators can view user statistics'
      );
    }

    const allUsers = await this.userRepository.findAll();

    // Calculate recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await this.userRepository.findByDateRange(
      thirtyDaysAgo,
      new Date()
    );

    // Count users by role
    const roleCounts = {
      [UserRole.ADMIN]: 0,
      [UserRole.EDITOR]: 0,
      [UserRole.VIEWER]: 0,
    };

    for (const user of allUsers) {
      roleCounts[user.role]++;
    }

    return {
      totalUsers: allUsers.length,
      adminCount: roleCounts[UserRole.ADMIN],
      editorCount: roleCounts[UserRole.EDITOR],
      viewerCount: roleCounts[UserRole.VIEWER],
      recentRegistrations: recentUsers.length,
    };
  }

  /**
   * Validates user permissions for a specific action
   * @param user The user to validate
   * @param action The action to validate ('read', 'write', 'delete')
   * @param resource Optional resource context
   * @returns Promise resolving to validation result
   */
  async validateUserPermissions(
    user: User,
    action: 'read' | 'write' | 'delete',
    resource?: any
  ): Promise<{ hasPermission: boolean; reason?: string }> {
    const permissionContext = new PermissionContext(user);

    let hasPermission = false;
    let reason: string | undefined;

    switch (action) {
      case 'read':
        hasPermission = permissionContext.canRead(user, resource);
        if (!hasPermission) {
          reason = 'User does not have read permissions';
        }
        break;
      case 'write':
        hasPermission = permissionContext.canWrite(user, resource);
        if (!hasPermission) {
          reason = 'User does not have write permissions';
        }
        break;
      case 'delete':
        hasPermission = permissionContext.canDelete(user, resource);
        if (!hasPermission) {
          reason = 'User does not have delete permissions';
        }
        break;
      default:
        reason = 'Invalid action specified';
    }

    return { hasPermission, reason };
  }

  // Private helper methods

  /**
   * Validates user registration data
   */
  private validateRegisterUserData(data: RegisterUserDto): void {
    if (!data.name || typeof data.name !== 'string') {
      throw new ValidationError('User name is required');
    }

    if (data.name.trim().length < 2) {
      throw new ValidationError('User name must be at least 2 characters');
    }

    if (data.name.trim().length > 100) {
      throw new ValidationError('User name cannot exceed 100 characters');
    }

    if (!data.email || typeof data.email !== 'string') {
      throw new ValidationError('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      throw new ValidationError('Invalid email format');
    }

    if (!Object.values(UserRole).includes(data.role)) {
      throw new ValidationError('Invalid user role');
    }
  }

  /**
   * Validates user update data
   */
  private validateUpdateUserData(data: UpdateUserDto): void {
    if (data.name !== undefined) {
      if (typeof data.name !== 'string') {
        throw new ValidationError('User name must be a string');
      }

      if (data.name.trim().length < 2) {
        throw new ValidationError('User name must be at least 2 characters');
      }

      if (data.name.trim().length > 100) {
        throw new ValidationError('User name cannot exceed 100 characters');
      }
    }

    if (data.email !== undefined) {
      if (typeof data.email !== 'string') {
        throw new ValidationError('Email must be a string');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email.trim())) {
        throw new ValidationError('Invalid email format');
      }
    }

    if (data.role !== undefined) {
      if (!Object.values(UserRole).includes(data.role)) {
        throw new ValidationError('Invalid user role');
      }
    }
  }

  /**
   * Maps User entity to response DTO
   */
  private mapToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isAdmin: user.isAdmin(),
      canEdit: user.canEdit(),
      isViewerOnly: user.isViewerOnly(),
    };
  }
}
