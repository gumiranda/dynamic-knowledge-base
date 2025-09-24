import { Request, Response, NextFunction } from 'express';
import { UserController } from '../UserController';
import { UserService } from '../../../application/services/UserService';
import { User } from '../../../domain/entities/User';
import { UserRole } from '../../../domain/enums/UserRole';
import {
  RegisterUserDto,
  UpdateUserDto,
  AuthenticateUserDto,
} from '../../../application/dtos/UserDto';

// Mock the UserService
jest.mock('../../../application/services/UserService');

describe('UserController', () => {
  let userController: UserController;
  let mockUserService: jest.Mocked<UserService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockUserService = new UserService(null as any) as jest.Mocked<UserService>;
    userController = new UserController(mockUserService);

    mockRequest = {
      params: {},
      body: {},
      query: {},
      user: new User({
        id: 'admin1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      }),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a user successfully', async () => {
      // Arrange
      const registerUserDto: RegisterUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        role: UserRole.VIEWER,
      };

      const mockCreatedUser = {
        id: 'user1',
        name: 'Test User',
        email: 'test@example.com',
        role: UserRole.VIEWER,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAdmin: false,
        canEdit: false,
        isViewerOnly: true,
      };

      mockRequest.body = registerUserDto;
      mockUserService.registerUser.mockResolvedValue(mockCreatedUser as any);

      // Act
      await userController.registerUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.registerUser).toHaveBeenCalledWith(
        registerUserDto,
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'User registered successfully',
        data: {
          user: mockCreatedUser,
        },
      });
    });

    it('should handle invalid user role', async () => {
      // Arrange
      mockRequest.body = {
        name: 'Test User',
        email: 'test@example.com',
        role: 'invalid_role',
      };

      // Act
      await userController.registerUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid user role',
        })
      );
    });

    it('should prevent non-admin from registering elevated roles', async () => {
      // Arrange
      mockRequest.user = new User({
        id: 'viewer1',
        name: 'Viewer User',
        email: 'viewer@example.com',
        role: UserRole.VIEWER,
      });

      mockRequest.body = {
        name: 'Test User',
        email: 'test@example.com',
        role: UserRole.ADMIN,
      };

      // Act
      await userController.registerUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Only administrators can register users with elevated roles',
        })
      );
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate a user successfully', async () => {
      // Arrange
      const authenticateUserDto: AuthenticateUserDto = {
        email: 'test@example.com',
      };

      const mockAuthenticatedUser = {
        id: 'user1',
        name: 'Test User',
        email: 'test@example.com',
        role: UserRole.VIEWER,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAdmin: false,
        canEdit: false,
        isViewerOnly: true,
      };

      mockRequest.body = authenticateUserDto;
      mockUserService.authenticateUser.mockResolvedValue(
        mockAuthenticatedUser as any
      );

      // Act
      await userController.authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.authenticateUser).toHaveBeenCalledWith(
        authenticateUserDto
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'User authenticated successfully',
        data: {
          user: mockAuthenticatedUser,
        },
      });
    });

    it('should handle user not found', async () => {
      // Arrange
      mockRequest.body = { email: 'nonexistent@example.com' };
      mockUserService.authenticateUser.mockResolvedValue(null);

      // Act
      await userController.authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not found',
        })
      );
    });

    it('should handle missing email', async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await userController.authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Email is required for authentication',
        })
      );
    });
  });

  describe('getUser', () => {
    it('should retrieve a user successfully', async () => {
      // Arrange
      const userId = 'user1';
      const mockUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        role: UserRole.VIEWER,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAdmin: false,
        canEdit: false,
        isViewerOnly: true,
      };

      mockRequest.params = { id: userId };
      mockUserService.getUser.mockResolvedValue(mockUser as any);

      // Act
      await userController.getUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.getUser).toHaveBeenCalledWith(
        userId,
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: mockUser,
        },
      });
    });

    it('should handle user not found', async () => {
      // Arrange
      const userId = 'nonexistent';
      mockRequest.params = { id: userId };
      mockUserService.getUser.mockResolvedValue(null);

      // Act
      await userController.getUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `User with ID ${userId} not found`,
        })
      );
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      // Arrange
      const userId = 'user1';
      const updateUserDto: UpdateUserDto = {
        name: 'Updated User',
        email: 'updated@example.com',
      };

      const mockUpdatedUser = {
        id: userId,
        name: 'Updated User',
        email: 'updated@example.com',
        role: UserRole.VIEWER,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAdmin: false,
        canEdit: false,
        isViewerOnly: true,
      };

      mockRequest.params = { id: userId };
      mockRequest.body = updateUserDto;
      mockUserService.updateUser.mockResolvedValue(mockUpdatedUser as any);

      // Act
      await userController.updateUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.updateUser).toHaveBeenCalledWith(
        userId,
        updateUserDto,
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'User updated successfully',
        data: {
          user: mockUpdatedUser,
        },
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      // Arrange
      const userId = 'user1';
      mockRequest.params = { id: userId };
      mockUserService.deleteUser.mockResolvedValue(true);

      // Act
      await userController.deleteUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.deleteUser).toHaveBeenCalledWith(
        userId,
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'User deleted successfully',
        data: {
          deleted: true,
        },
      });
    });
  });

  describe('getUsers', () => {
    it('should get all users successfully', async () => {
      // Arrange
      const mockUsers = [
        {
          id: 'user1',
          name: 'User 1',
          email: 'user1@example.com',
          role: UserRole.VIEWER,
          createdAt: new Date(),
          updatedAt: new Date(),
          isAdmin: false,
          canEdit: false,
          isViewerOnly: true,
        },
      ];

      mockUserService.getAllUsers.mockResolvedValue(mockUsers as any);

      // Act
      await userController.getUsers(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.getAllUsers).toHaveBeenCalledWith(
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          users: mockUsers,
          totalCount: mockUsers.length,
        },
      });
    });

    it('should search users when search query provided', async () => {
      // Arrange
      const searchTerm = 'test';
      const mockSearchResult = {
        users: [
          {
            id: 'user1',
            name: 'Test User',
            email: 'test@example.com',
            role: UserRole.VIEWER,
            createdAt: new Date(),
            updatedAt: new Date(),
            isAdmin: false,
            canEdit: false,
            isViewerOnly: true,
          },
        ],
        totalCount: 1,
        searchTerm,
      };

      mockRequest.query = { search: searchTerm };
      mockUserService.searchUsers.mockResolvedValue(mockSearchResult as any);

      // Act
      await userController.getUsers(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.searchUsers).toHaveBeenCalledWith(
        searchTerm,
        mockRequest.user,
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      // Arrange
      const mockCurrentUser = {
        id: 'admin1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAdmin: true,
        canEdit: true,
        isViewerOnly: false,
      };

      mockUserService.getUser.mockResolvedValue(mockCurrentUser as any);

      // Act
      await userController.getCurrentUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockUserService.getUser).toHaveBeenCalledWith(
        mockRequest.user!.id,
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: mockCurrentUser,
        },
      });
    });
  });
});
