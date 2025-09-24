import { UserService } from '../UserService';
import { User } from '../../../domain/entities/User';
import { UserRole } from '../../../domain/enums/UserRole';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import {
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

// Mock implementations
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

    it('should register user successfully with admin', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      const newUser = new User({
        ...registerData,
        id: 'new-user-1',
      });
      mockUserRepository.create.mockResolvedValue(newUser);

      // Act
      const result = await userService.registerUser(registerData, adminUser);

      // Assert
      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.any(User));
      expect(result).toEqual(
        expect.objectContaining({
          name: registerData.name,
          email: registerData.email,
          role: registerData.role,
        })
      );
    });

    it('should throw UnauthorizedError for non-admin registering elevated roles', async () => {
      // Act & Assert
      await expect(
        userService.registerUser(registerData, viewerUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw ConflictError for duplicate email', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(editorUser);

      // Act & Assert
      await expect(
        userService.registerUser(registerData, adminUser)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('authenticateUser', () => {
    const authData: AuthenticateUserDto = {
      email: 'editor@test.com',
    };

    it('should authenticate user successfully', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(editorUser);

      // Act
      const result = await userService.authenticateUser(authData);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        authData.email
      );
      expect(result).toEqual(
        expect.objectContaining({
          email: editorUser.email,
          role: editorUser.role,
        })
      );
    });

    it('should return null for non-existent user', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await userService.authenticateUser(authData);

      // Assert
      expect(result).toBeNull();
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
      const updatedUser = new User({
        ...editorUser,
        ...validUpdateDto,
      });
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await userService.updateUser(
        editorUser.id,
        validUpdateDto,
        editorUser
      );

      // Assert
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        editorUser.id,
        validUpdateDto
      );
      expect(result.name).toBe(validUpdateDto.name);
      expect(result.email).toBe(validUpdateDto.email);
    });

    it('should throw UnauthorizedError for updating other users without admin', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(adminUser);

      // Act & Assert
      await expect(
        userService.updateUser('admin-1', validUpdateDto, editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        userService.updateUser('non-existent', validUpdateDto, adminUser)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getUser', () => {
    it('should retrieve user successfully', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(editorUser);

      // Act
      const result = await userService.getUser('editor-1', adminUser);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith('editor-1');
      expect(result).toEqual(
        expect.objectContaining({
          name: editorUser.name,
          email: editorUser.email,
          role: editorUser.role,
        })
      );
    });

    it('should return null for non-existent user', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await userService.getUser('non-existent', adminUser);

      // Assert
      expect(result).toBeNull();
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
      expect(mockUserRepository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(3);
    });

    it('should throw UnauthorizedError for non-admin', async () => {
      // Act & Assert
      await expect(userService.getAllUsers(editorUser)).rejects.toThrow(
        UnauthorizedError
      );
    });
  });

  describe('assignRole', () => {
    it('should assign role successfully by admin', async () => {
      const validAssignmentDto: AssignRoleDto = {
        userId: editorUser.id,
        newRole: UserRole.ADMIN,
        assignedBy: adminUser.id,
      };
      // Arrange
      mockUserRepository.findById.mockResolvedValue(editorUser);
      const userWithNewRole = new User({
        ...editorUser,
        role: UserRole.ADMIN,
      });
      mockUserRepository.update.mockResolvedValue(userWithNewRole);

      // Act
      const result = await userService.assignRole(
        validAssignmentDto,
        adminUser
      );

      // Assert
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        editorUser.id,
        expect.objectContaining({
          role: UserRole.ADMIN,
        })
      );
      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should throw UnauthorizedError for non-admin', async () => {
      const validAssignmentDto: AssignRoleDto = {
        userId: editorUser.id,
        newRole: UserRole.ADMIN,
        assignedBy: adminUser.id,
      };
      
      // Act & Assert
      await expect(
        userService.assignRole(validAssignmentDto, editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully with admin', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(editorUser);
      mockUserRepository.delete.mockResolvedValue(true);

      // Act
      const result = await userService.deleteUser('editor-1', adminUser);

      // Assert
      expect(mockUserRepository.delete).toHaveBeenCalledWith('editor-1');
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedError for non-admin', async () => {
      // Act & Assert
      await expect(
        userService.deleteUser('editor-1', editorUser)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics for admin', async () => {
      // Arrange
      const allUsers = [adminUser, editorUser, viewerUser];
      mockUserRepository.findAll.mockResolvedValue(allUsers);
      mockUserRepository.findByDateRange.mockResolvedValue([viewerUser]);

      // Act
      const result = await userService.getUserStats(adminUser);

      // Assert
      expect(result.totalUsers).toBe(3);
      expect(result.adminCount).toBe(1);
      expect(result.editorCount).toBe(1);
      expect(result.viewerCount).toBe(1);
    });

    it('should throw UnauthorizedError for non-admin', async () => {
      // Act & Assert
      await expect(userService.getUserStats(editorUser)).rejects.toThrow(
        UnauthorizedError
      );
    });
  });

  describe('validateUserPermissions', () => {
    it('should validate read permissions for viewer', async () => {
      // Act
      const result = await userService.validateUserPermissions(
        viewerUser,
        'read'
      );

      // Assert
      expect(result.hasPermission).toBe(true);
    });

    it('should validate write permissions for editor', async () => {
      // Act
      const result = await userService.validateUserPermissions(
        editorUser,
        'write'
      );

      // Assert
      expect(result.hasPermission).toBe(true);
    });

    it('should validate delete permissions for admin', async () => {
      // Act
      const result = await userService.validateUserPermissions(
        adminUser,
        'delete'
      );

      // Assert
      expect(result.hasPermission).toBe(true);
    });
  });
});
