import { UserRole } from '../../domain/enums/UserRole';

/**
 * Data Transfer Objects for User operations
 */

/**
 * DTO for user registration
 */
export interface RegisterUserDto {
  name: string;
  email: string;
  role: UserRole;
}

/**
 * DTO for updating user information
 */
export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: UserRole;
}

/**
 * DTO for user response (safe representation)
 */
export interface UserResponseDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isAdmin: boolean;
  canEdit: boolean;
  isViewerOnly: boolean;
}

/**
 * DTO for user authentication
 */
export interface AuthenticateUserDto {
  email: string;
  // In a real system, this would include password or other auth credentials
  // For this demo, we'll use email-based authentication
}

/**
 * DTO for user search results
 */
export interface UserSearchDto {
  users: UserResponseDto[];
  totalCount: number;
  searchTerm?: string;
  roleFilter?: UserRole;
}

/**
 * DTO for user role assignment
 */
export interface AssignRoleDto {
  userId: string;
  newRole: UserRole;
  assignedBy: string; // ID of the user making the assignment
}

/**
 * DTO for user statistics
 */
export interface UserStatsDto {
  totalUsers: number;
  adminCount: number;
  editorCount: number;
  viewerCount: number;
  recentRegistrations: number; // Users registered in last 30 days
}
