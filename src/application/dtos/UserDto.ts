import { UserRole } from '../../domain/enums/UserRole';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Data Transfer Objects for User operations
 */

/**
 * DTO for user registration
 */
export class RegisterUserDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  @Matches(/^[a-zA-Z\s\-'\\.]+$/, {
    message:
      'Name can only contain letters, spaces, hyphens, apostrophes, and periods',
  })
  name: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(UserRole, {
    message: `Role must be one of: ${Object.values(UserRole).join(', ')}`,
  })
  role: UserRole;

  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;
}

/**
 * DTO for updating user information
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  @Matches(/^[a-zA-Z\s\-'\\.]+$/, {
    message:
      'Name can only contain letters, spaces, hyphens, apostrophes, and periods',
  })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @IsOptional()
  @IsEnum(UserRole, {
    message: `Role must be one of: ${Object.values(UserRole).join(', ')}`,
  })
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
 * DTO for user authentication (legacy - for backward compatibility)
 */
export class AuthenticateUserDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
}

/**
 * DTO for user login with password
 */
export class LoginUserDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

/**
 * DTO for login response with JWT token
 */
export interface LoginResponseDto {
  user: UserResponseDto;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
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
