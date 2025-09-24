import { JwtService } from '../../infrastructure/services/JwtService';
import { User } from '../../domain/entities/User';
import { UserRole } from '../../domain/enums/UserRole';

/**
 * Test utilities for JWT token generation and validation
 */
export class JwtTestUtils {
  private static jwtService = new JwtService();

  /**
   * Generates a JWT token for a test user
   * @param user The user to generate a token for
   * @returns JWT token string
   */
  static generateToken(user: User): string {
    return this.jwtService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
  }

  /**
   * Generates a JWT token for a user with specific properties
   * @param userId User ID
   * @param email User email
   * @param role User role
   * @returns JWT token string
   */
  static generateTokenForUser(userId: string, email: string, role: UserRole): string {
    return this.jwtService.generateAccessToken({
      userId,
      email,
      role,
    });
  }

  /**
   * Creates test users with generated JWT tokens
   * @returns Object containing test users and their tokens
   */
  static createTestUsersWithTokens() {
    const adminUser = new User({
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
    });

    const editorUser = new User({
      id: 'editor-1',
      name: 'Editor User',
      email: 'editor@test.com',
      role: UserRole.EDITOR,
    });

    const viewerUser = new User({
      id: 'viewer-1',
      name: 'Viewer User',
      email: 'viewer@test.com',
      role: UserRole.VIEWER,
    });

    return {
      adminUser,
      editorUser,
      viewerUser,
      adminToken: this.generateToken(adminUser),
      editorToken: this.generateToken(editorUser),
      viewerToken: this.generateToken(viewerUser),
    };
  }

  /**
   * Get JWT service instance for direct access in tests
   * @returns JwtService instance
   */
  static getJwtService(): JwtService {
    return this.jwtService;
  }
}