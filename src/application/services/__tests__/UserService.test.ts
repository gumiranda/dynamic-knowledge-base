import { UserService } from '../UserService';
import { User } from '../../../domain/entities/User';
import { UserRole } from '../../../domain/enums/UserRole';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '../../errors/AppError';
import {
  RegisterUserDto,
  UpdateUserDto,
  AuthenticateUserDto,
  AssignRoleDto,
} from '../../dtos/UserDto';

// Mock implementation
const mockUserRepository: jest.Mocked<IUserRepository> = {
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByEmail: jest.fn(),
  findByRole: jest.fn(),
  findByName: jest.fn(),
  existsByEmail: jest.fn(),
  existsByEmailExcluding: jest.fn(),
  countByRole: jest.fn(),
  findByDateRange: jest.fn(),
  findMostRecent: jest.fn(),
  findAdmins: jest.fn(),
  findEditors: jest.fn(),
  findViewers: jest.fn(),
  updateRole: jest.fn(),
  hasAdminUser: jest.fn(),
  getTotalCount: jest.fn(),
};

describe('UserService', () => {
  let userService: UserService;
  let adminUser: User;
  let editorUser: User;
  let viewerUser: User;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize service
    userService = new UserService(mockUserRepository);

    // Create test users
    adminUser = new User({
      name: 'Admin User',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
    });

    editorUser = new User({
      name: 'Editor User',
      email: 'editor@test.com',
      role: UserRole.EDITOR,
    });

    viewerUser = new User({
      name: 'Viewer User',
      email: 'viewer@test.com',
      role: UserRole.VIEWER,
    });
  });

  describe('registerUser', () => {
    const validRegisterDto: RegisterUserDto = {
      name: 'New User',
      email: 'newuser@test.com',
      role: UserRole.EDITOR,
    };

    it('should register user successfully with admin registering', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(editorUser);

      // Act
      const result = await userService.registerUser(validRegisterDto, adminUser);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        validRegisterDto.email.toLowerCase()
      );
      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.any(User));
      expect(result).toEqual(expect.objectContaining({
        name: editorUser.name,
        email: editorUser.email,
        role: editorUser.role,
      }));
    });

    it('should register user successfully for self-registration', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(editorUser);

      // Act
      const result = await userService.registerUser(validRegisterDto);

      // Assert
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw UnauthorizedError when non-admin tries to register others', async () => {
      // Act & Assert
      await expect(
        userService.registerUser(validRegisterDto, editorUser)
      ).rejects.toThrow(UnauthorizedError);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when email already exists', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(editorUser);

      // Act & Assert
      await expect(
        userService.registerUser(validRegisterDto, adminUser)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError for invalid name', async () => {
      // Arrange
      const invalidDto: RegisterUserDto = {
        ...validRegisterDto,
        name: 'A', // Too short
      };

      // Act & Assert
      await expect(
        userService.registerUser(invalidDto, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for name exceeding 100 characters', async () => {
      // Arrange
      const invalidDto: RegisterUserDto = {
        ...validRegisterDto,
        name: 'a'.repeat(101),
      };

      // Act & Assert
      await expect(
        userService.registerUser(invalidDto, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid email format', async () => {
      // Arrange
      const invalidDto: RegisterUserDto = {
        ...validRegisterDto,
        email: 'invalid-email',
      };

      // Act & Assert
      await expect(
        userService.registerUser(invalidDto, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid role', async () => {
      // Arrange
      const invalidDto: RegisterUserDto = {
        ...validRegisterDto,
        role: 'InvalidRole' as UserRole,
      };

      // Act & Assert
      await expect(
        userService.registerUser(invalidDto, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const dtoWithUppercaseEmail: RegisterUserDto = {
        ...validRegisterDto,
        email: 'NEWUSER@TEST.COM',
      };
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(editorUser);

      // Act
      await userService.registerUser(dtoWithUppercaseEmail, adminUser);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('newuser@test.com');
    });
  });

  describe('authenticateUser', () => {
    const validAuthDto: AuthenticateUserDto = {
      email: 'admin@test.com',
    };

    it('should authenticate user successfully', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(adminUser);

      // Act
      const result = await userService.authenticateUser(validAuthDto);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        validAuthDto.email.toLowerCase()
      );
      expect(result).toEqual(expect.objectContaining({
        id: adminUser.id,
        email: adminUser.email,
      }));
    });

    it('should return null when user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await userService.authenticateUser(validAuthDto);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw ValidationError for missing email', async () => {
      // Arrange
      const invalidDto: AuthenticateUserDto = {
        email: '',
      };

      // Act & Assert
      await expect(
        userService.authenticateUser(invalidDto)
      ).rejects.toThrow(ValidationError);
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const dtoWithUppercaseEmail: AuthenticateUserDto = {
        email: 'ADMIN@TEST.COM',
      };
      mockUserRepository.findByEmail.mockResolvedValue(adminUser);

      // Act
      await userService.authenticateUser(dtoWithUppercaseEmail);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('admin@test.com');
    });
  });

  describe('updateUser', () => {
    const validUpdateDto: UpdateUserDto = {
      name: 'Updated Name',
      email: 'updated@test.com',
    };

    it('should allow user to update themselves', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(editorUser);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue({
        ...editorUser,
        ...validUpdateDto,
      });

      // Act
      const result = await userService.updateUser(
        editorUser.id,
        validUpdateDto,
        editorUser
      );

      // Assert
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        editorUser.id,
        expect.any(User)
      );
      expect(result.name).toBe(validUpdateDto.name);
      expect(result.email).toBe(validUpdateDto.email);
    });

    it('should allow admin to update other users', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(editorUser);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue({
        ...editorUser,
        ...validUpdateDto,
      });

      // Act
      const result = await userService.updateUser(
        editorUser.id,
        validUpdateDto,
        adminUser
      );

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw UnauthorizedError when non-admin tries to update others', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(adminUser);

      // Act & Assert
      await expect(
        userService.updateUser(adminUser.id, validUpdateDto, editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        userService.updateUser('non-existent-id', validUpdateDto, adminUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should check email uniqueness when email is updated', async () => {
      // Arrange
      const updateWithNewEmail: UpdateUserDto = {
        email: 'newemail@test.com',
      };
      mockUserRepository.findById.mockResolvedValue(editorUser);
      mockUserRepository.findByEmail.mockResolvedValue(adminUser); // Different user has this email

      // Act & Assert
      await expect(
        userService.updateUser(editorUser.id, updateWithNewEmail, editorUser)
      ).rejects.toThrow(ConflictError);
    });

    it('should allow role updates by admin only', async () => {
      // Arrange
      const updateWithRole: UpdateUserDto = {
        role: UserRole.ADMIN,
      };
      mockUserRepository.findById.mockResolvedValue(editorUser);
      mockUserRepository.update.mockResolvedValue({
        ...editorUser,
        role: UserRole.ADMIN,
      });

      // Act
      const result = await userService.updateUser(
        editorUser.id,
        updateWithRole,
        adminUser
      );

      // Assert
      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should throw UnauthorizedError when non-admin tries to change roles', async () => {
      // Arrange
      const updateWithRole: UpdateUserDto = {
        role: UserRole.ADMIN,
      };
      mockUserRepository.findById.mockResolvedValue(editorUser);

      // Act & Assert
      await expect(
        userService.updateUser(editorUser.id, updateWithRole, editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should prevent admin from demoting themselves', async () => {
      // Arrange
      const updateWithDemotion: UpdateUserDto = {
        role: UserRole.EDITOR,
      };
      mockUserRepository.findById.mockResolvedValue(adminUser);

      // Act & Assert
      await expect(
        userService.updateUser(adminUser.id, updateWithDemotion, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid email format', async () => {
      // Arrange
      const invalidUpdate: UpdateUserDto = {
        email: 'invalid-email',
      };
      mockUserRepository.findById.mockResolvedValue(editorUser);

      // Act & Assert
      await expect(
        userService.updateUser(editorUser.id, invalidUpdate, editorUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getUser', () => {
    it('should retrieve user successfully', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(editorUser);

      // Act
      const result = await userService.getUser(editorUser.id, adminUser);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: editorUser.id,
        name: editorUser.name,
      }));
    });

    it('should return null when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await userService.getUser('non-existent-id', adminUser);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw UnauthorizedError for viewer without permissions', async () => {
      // Act & Assert
      await expect(
        userService.getUser(editorUser.id, viewerUser)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users for admin', async () => {
      // Arrange
      const allUsers = [adminUser, editorUser, viewerUser];
      mockUserRepository.findAll.mockResolvedValue(allUsers);

      // Act
      const result = await userService.getAllUsers(adminUser);

      // Assert
      expect(result).toHaveLength(3);
    });

    it('should throw UnauthorizedError for non-admin', async () => {
      // Act & Assert
      await expect(
        userService.getAllUsers(editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('searchUsers', () => {
    it('should search users by name and email', async () => {
      // Arrange
      const searchTerm = 'test';
      const nameResults = [editorUser];
      const emailUser = adminUser;

      mockUserRepository.findByName.mockResolvedValue(nameResults);
      mockUserRepository.findByEmail.mockResolvedValue(emailUser);

      // Act
      const result = await userService.searchUsers(searchTerm, adminUser);

      // Assert
      expect(mockUserRepository.findByName).toHaveBeenCalledWith(searchTerm);
      expect(result.users).toHaveLength(1);
      expect(result.searchTerm).toBe(searchTerm);
    });

    it('should search by email when search term contains @', async () => {
      // Arrange
      const emailSearchTerm = 'admin@test.com';
      mockUserRepository.findByName.mockResolvedValue([]);
      mockUserRepository.findByEmail.mockResolvedValue(adminUser);

      // Act
      const result = await userService.searchUsers(emailSearchTerm, adminUser);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(emailSearchTerm);
      expect(result.users).toHaveLength(1);
    });

    it('should filter by role when specified', async () => {
      // Arrange
      const searchTerm = 'user';
      const allResults = [adminUser, editorUser, viewerUser];
      mockUserRepository.findByName.mockResolvedValue(allResults);
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await userService.searchUsers(
        searchTerm,
        adminUser,
        UserRole.EDITOR
      );

      // Assert
      expect(result.users).toHaveLength(1);
      expect(result.users[0].role).toBe(UserRole.EDITOR);
      expect(result.roleFilter).toBe(UserRole.EDITOR);
    });

    it('should deduplicate search results', async () => {
      // Arrange
      const searchTerm = 'admin@test.com';
      mockUserRepository.findByName.mockResolvedValue([adminUser]);
      mockUserRepository.findByEmail.mockResolvedValue(adminUser);

      // Act
      const result = await userService.searchUsers(searchTerm, adminUser);

      // Assert
      expect(result.users).toHaveLength(1);
    });

    it('should throw UnauthorizedError for non-admin', async () => {
      // Act & Assert
      await expect(
        userService.searchUsers('test', editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw ValidationError for empty search term', async () => {
      // Act & Assert
      await expect(
        userService.searchUsers('', adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('assignRole', () => {
    const validAssignmentDto: AssignRoleDto = {
      userId: editorUser.id,
      newRole: UserRole.ADMIN,
    };

    it('should assign role successfully by admin', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(editorUser);
      mockUserRepository.update.mockResolvedValue({
        ...editorUser,
        role: UserRole.ADMIN,
      });

      // Act
      const result = await userService.assignRole(validAssignmentDto, adminUser);

      // Assert
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        editorUser.id,
        expect.any(User)
      );
      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should throw UnauthorizedError for non-admin', async () => {
      // Act & Assert
      await expect(
        userService.assignRole(validAssignmentDto, editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError when target user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        userService.assignRole(validAssignmentDto, adminUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should prevent admin from demoting themselves', async () => {
      // Arrange
      const selfDemotionDto: AssignRoleDto = {
        userId: adminUser.id,
        newRole: UserRole.EDITOR,
      };
      mockUserRepository.findById.mockResolvedValue(adminUser);

      // Act & Assert
      await expect(
        userService.assignRole(selfDemotionDto, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid role', async () => {
      // Arrange
      const invalidRoleDto: AssignRoleDto = {
        userId: editorUser.id,
        newRole: 'InvalidRole' as UserRole,
      };
      mockUserRepository.findById.mockResolvedValue(editorUser);

      // Act & Assert
      await expect(
        userService.assignRole(invalidRoleDto, adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully by admin', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(editorUser);
      mockUserRepository.delete.mockResolvedValue(true);

      // Act
      const result = await userService.deleteUser(editorUser.id, adminUser);

      // Assert
      expect(mockUserRepository.delete).toHaveBeenCalledWith(editorUser.id);
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedError for non-admin', async () => {
      // Act & Assert
      await expect(
        userService.deleteUser(editorUser.id, editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        userService.deleteUser('non-existent-id', adminUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should prevent admin from deleting themselves', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(adminUser);

      // Act & Assert
      await expect(
        userService.deleteUser(adminUser.id, adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics for admin', async () => {
      // Arrange
      const allUsers = [adminUser, editorUser, viewerUser];
      const recentUsers = [editorUser];
      
      mockUserRepository.findAll.mockResolvedValue(allUsers);
      mockUserRepository.findByDateRange.mockResolvedValue(recentUsers);

      // Act
      const result = await userService.getUserStats(adminUser);

      // Assert
      expect(result.totalUsers).toBe(3);
      expect(result.adminCount).toBe(1);
      expect(result.editorCount).toBe(1);
      expect(result.viewerCount).toBe(1);
      expect(result.recentRegistrations).toBe(1);
    });

    it('should throw UnauthorizedError for non-admin', async () => {
      // Act & Assert
      await expect(
        userService.getUserStats(editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('validateUserPermissions', () => {
    it('should validate read permissions correctly', async () => {
      // Act
      const adminResult = await userService.validateUserPermissions(
        adminUser,
        'read'
      );
      const viewerResult = await userService.validateUserPermissions(
        viewerUser,
        'read'
      );

      // Assert
      expect(adminResult.hasPermission).toBe(true);
      expect(viewerResult.hasPermission).toBe(true);
    });

    it('should validate write permissions correctly', async () => {
      // Act
      const adminResult = await userService.validateUserPermissions(
        adminUser,
        'write'
      );
      const editorResult = await userService.validateUserPermissions(
        editorUser,
        'write'
      );
      const viewerResult = await userService.validateUserPermissions(
        viewerUser,
        'write'
      );

      // Assert
      expect(adminResult.hasPermission).toBe(true);
      expect(editorResult.hasPermission).toBe(true);
      expect(viewerResult.hasPermission).toBe(false);
      expect(viewerResult.reason).toContain('write permissions');
    });

    it('should validate delete permissions correctly', async () => {
      // Act
      const adminResult = await userService.validateUserPermissions(
        adminUser,
        'delete'
      );
      const editorResult = await userService.validateUserPermissions(
        editorUser,
        'delete'
      );

      // Assert
      expect(adminResult.hasPermission).toBe(true);
      expect(editorResult.hasPermission).toBe(false);
      expect(editorResult.reason).toContain('delete permissions');
    });

    it('should return error for invalid action', async () => {
      // Act
      const result = await userService.validateUserPermissions(
        adminUser,
        'invalid' as any
      );

      // Assert
      expect(result.hasPermission).toBe(false);
      expect(result.reason).toContain('Invalid action');
    });
  });
});

    // Create service instance
    userService = new UserService(mockUserRepository);

    // Create test users
    adminUser = new User({
      name: 'Admin User',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
      id: 'admin-1',
    });

    editorUser = new User({
      name: 'Editor User',
      email: 'editor@test.com',
      role: UserRole.EDITOR,
      id: 'editor-1',
    });

    viewerUser = new User({
      name: 'Viewer User',
      email: 'viewer@test.com',
      role: UserRole.VIEWER,
      id: 'viewer-1',
    });
  });

  describe('registerUser', () => {
    const registerData: RegisterUserDto = {
      name: 'New User',
      email: 'newuser@test.com',
      role: UserRole.EDITOR,
    };

    beforeEach(() => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
    });

    it('should register user successfully with admin', async () => {
      const newUser = new User({
        name: 'New User',
        email: 'newuser@test.com',
        role: UserRole.EDITOR,
        id: 'new-user-1',
      });

      mockUserRepository.create.mockResolvedValue(newUser);

      const result = await userService.registerUser(registerData, adminUser);

      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.any(User));
      expect(result).toEqual(
        expect.objectContaining({
          name: 'New User',
          email: 'newuser@test.com',
          role: UserRole.EDITOR,
        })
      );
    });

    it('should allow self-registration without registeredBy', async () => {
      const newUser = new User({
        name: 'New User',
        email: 'newuser@test.com',
        role: UserRole.VIEWER,
        id: 'new-user-1',
      });

      mockUserRepository.create.mockResolvedValue(newUser);

      const selfRegisterData = { ...registerData, role: UserRole.VIEWER };
      const result = await userService.registerUser(selfRegisterData);

      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw UnauthorizedError for viewer trying to register others', async () => {
      await expect(
        userService.registerUser(registerData, viewerUser)
      ).rejects.toThrow(UnauthorizedError);

      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should prevent duplicate email registration', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(editorUser);

      await expect(
        userService.registerUser(registerData, adminUser)
      ).rejects.toThrow(ConflictError);
    });

    it('should validate required fields', async () => {
      const invalidData: RegisterUserDto = {
        name: '',
        email: 'invalid-email',
        role: UserRole.EDITOR,
      };

      await expect(
        userService.registerUser(invalidData, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate email format', async () => {
      const invalidData: RegisterUserDto = {
        name: 'Valid Name',
        email: 'not-an-email',
        role: UserRole.EDITOR,
      };

      await expect(
        userService.registerUser(invalidData, adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate name length', async () => {
      const invalidData: RegisterUserDto = {
        name: 'A', // Too short
        email: 'valid@test.com',
        role: UserRole.EDITOR,
      };

      await expect(
        userService.registerUser(invalidData, adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate user successfully', async () => {
      const authData: AuthenticateUserDto = {
        email: 'editor@test.com',
      };

      mockUserRepository.findByEmail.mockResolvedValue(editorUser);

      const result = await userService.authenticateUser(authData);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        'editor@test.com'
      );
      expect(result).toEqual(
        expect.objectContaining({
          email: 'editor@test.com',
          role: UserRole.EDITOR,
        })
      );
    });

    it('should return null for non-existent user', async () => {
      const authData: AuthenticateUserDto = {
        email: 'nonexistent@test.com',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await userService.authenticateUser(authData);

      expect(result).toBeNull();
    });

    it('should validate email is provided', async () => {
      const authData: AuthenticateUserDto = {
        email: '',
      };

      await expect(userService.authenticateUser(authData)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('updateUser', () => {
    const updateData: UpdateUserDto = {
      name: 'Updated Name',
    };

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(editorUser);
      mockUserRepository.update.mockResolvedValue(editorUser);
    });

    it('should allow user to update themselves', async () => {
      const result = await userService.updateUser(
        'editor-1',
        updateData,
        editorUser
      );

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        'editor-1',
        expect.any(User)
      );
      expect(result).toBeDefined();
    });

    it('should allow admin to update other users', async () => {
      const result = await userService.updateUser(
        'editor-1',
        updateData,
        adminUser
      );

      expect(mockUserRepository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should prevent non-admin from updating other users', async () => {
      // Mock finding the admin user (different from the editor making the request)
      mockUserRepository.findById.mockResolvedValue(adminUser);

      await expect(
        userService.updateUser('admin-1', updateData, editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        userService.updateUser('non-existent', updateData, adminUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should prevent duplicate email updates', async () => {
      const emailUpdate: UpdateUserDto = {
        email: 'admin@test.com',
      };

      mockUserRepository.findByEmail.mockResolvedValue(adminUser);

      await expect(
        userService.updateUser('editor-1', emailUpdate, editorUser)
      ).rejects.toThrow(ConflictError);
    });

    it('should require admin permissions for role changes', async () => {
      const roleUpdate: UpdateUserDto = {
        role: UserRole.ADMIN,
      };

      await expect(
        userService.updateUser('editor-1', roleUpdate, editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should prevent admin self-demotion', async () => {
      const roleUpdate: UpdateUserDto = {
        role: UserRole.EDITOR,
      };

      // Mock finding the admin user being updated
      mockUserRepository.findById.mockResolvedValue(adminUser);

      await expect(
        userService.updateUser('admin-1', roleUpdate, adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getUser', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(editorUser);
    });

    it('should get user successfully', async () => {
      const result = await userService.getUser('editor-1', adminUser);

      expect(mockUserRepository.findById).toHaveBeenCalledWith('editor-1');
      expect(result).toEqual(
        expect.objectContaining({
          id: 'editor-1',
          email: 'editor@test.com',
        })
      );
    });

    it('should return null for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await userService.getUser('non-existent', adminUser);

      expect(result).toBeNull();
    });

    it('should allow viewers to read user information', async () => {
      const result = await userService.getUser('editor-1', viewerUser);

      expect(result).toBeDefined();
    });
  });

  describe('getAllUsers', () => {
    beforeEach(() => {
      mockUserRepository.findAll.mockResolvedValue([
        adminUser,
        editorUser,
        viewerUser,
      ]);
    });

    it('should get all users for admin', async () => {
      const result = await userService.getAllUsers(adminUser);

      expect(mockUserRepository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(3);
    });

    it('should throw UnauthorizedError for non-admin', async () => {
      await expect(userService.getAllUsers(editorUser)).rejects.toThrow(
        UnauthorizedError
      );
    });
  });

  describe('assignRole', () => {
    const assignmentData: AssignRoleDto = {
      userId: 'editor-1',
      newRole: UserRole.ADMIN,
      assignedBy: 'admin-1',
    };

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(editorUser);
      mockUserRepository.update.mockResolvedValue(editorUser);
    });

    it('should assign role successfully by admin', async () => {
      const result = await userService.assignRole(assignmentData, adminUser);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        'editor-1',
        expect.any(User)
      );
      expect(result).toBeDefined();
    });

    it('should throw UnauthorizedError for non-admin', async () => {
      await expect(
        userService.assignRole(assignmentData, editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should prevent admin self-demotion', async () => {
      const selfDemotionData: AssignRoleDto = {
        userId: 'admin-1',
        newRole: UserRole.EDITOR,
        assignedBy: 'admin-1',
      };

      mockUserRepository.findById.mockResolvedValue(adminUser);

      await expect(
        userService.assignRole(selfDemotionData, adminUser)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(editorUser);
      mockUserRepository.delete.mockResolvedValue(true);
    });

    it('should delete user successfully by admin', async () => {
      const result = await userService.deleteUser('editor-1', adminUser);

      expect(mockUserRepository.delete).toHaveBeenCalledWith('editor-1');
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedError for non-admin', async () => {
      await expect(
        userService.deleteUser('editor-1', editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should prevent self-deletion', async () => {
      mockUserRepository.findById.mockResolvedValue(adminUser);

      await expect(
        userService.deleteUser('admin-1', adminUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        userService.deleteUser('non-existent', adminUser)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getUserStats', () => {
    beforeEach(() => {
      mockUserRepository.findAll.mockResolvedValue([
        adminUser,
        editorUser,
        viewerUser,
      ]);
      mockUserRepository.findByDateRange.mockResolvedValue([viewerUser]);
    });

    it('should get user statistics for admin', async () => {
      const result = await userService.getUserStats(adminUser);

      expect(result).toEqual({
        totalUsers: 3,
        adminCount: 1,
        editorCount: 1,
        viewerCount: 1,
        recentRegistrations: 1,
      });
    });

    it('should throw UnauthorizedError for non-admin', async () => {
      await expect(userService.getUserStats(editorUser)).rejects.toThrow(
        UnauthorizedError
      );
    });
  });

  describe('validateUserPermissions', () => {
    it('should validate read permissions', async () => {
      const result = await userService.validateUserPermissions(
        viewerUser,
        'read'
      );

      expect(result.hasPermission).toBe(true);
    });

    it('should validate write permissions', async () => {
      const result = await userService.validateUserPermissions(
        viewerUser,
        'write'
      );

      expect(result.hasPermission).toBe(false);
      expect(result.reason).toBe('User does not have write permissions');
    });

    it('should validate delete permissions', async () => {
      const result = await userService.validateUserPermissions(
        editorUser,
        'delete'
      );

      expect(result.hasPermission).toBe(false);
      expect(result.reason).toBe('User does not have delete permissions');
    });
  });
});
