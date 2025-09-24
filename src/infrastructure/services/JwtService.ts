import * as jwt from 'jsonwebtoken';
import { UserRole } from '../../domain/enums/UserRole';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

/**
 * Service for managing JWT tokens
 * Handles token generation, validation, and refresh
 */
export class JwtService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    // In production, these should come from environment variables
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'your-super-secret-jwt-access-key-change-in-production';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'your-super-secret-jwt-refresh-key-change-in-production';
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '1h';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  /**
   * Generates access and refresh tokens for a user
   * @param payload The JWT payload containing user information
   * @returns TokenResponse with access token and optional refresh token
   */
  generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp'>): TokenResponse {
    const accessToken = jwt.sign(
      payload, 
      this.accessTokenSecret, 
      {
        expiresIn: this.accessTokenExpiry,
      } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { userId: payload.userId }, 
      this.refreshTokenSecret,
      {
        expiresIn: this.refreshTokenExpiry,
      } as jwt.SignOptions
    );

    // Calculate expiry time in seconds
    const expiresIn = this.getExpirationTime(this.accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Generates only an access token (for situations where refresh token is not needed)
   * @param payload The JWT payload containing user information
   * @returns Access token string
   */
  generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(
      payload, 
      this.accessTokenSecret, 
      {
        expiresIn: this.accessTokenExpiry,
      } as jwt.SignOptions
    );
  }

  /**
   * Verifies and decodes an access token
   * @param token The JWT token to verify
   * @returns Decoded JWT payload
   * @throws Error if token is invalid or expired
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.accessTokenSecret) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Verifies and decodes a refresh token
   * @param token The refresh token to verify
   * @returns Decoded refresh token payload
   * @throws Error if token is invalid or expired
   */
  verifyRefreshToken(token: string): { userId: string } {
    try {
      return jwt.verify(token, this.refreshTokenSecret) as { userId: string };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else {
        throw new Error('Refresh token verification failed');
      }
    }
  }

  /**
   * Extracts token from Authorization header
   * @param authHeader The Authorization header value
   * @returns The token string without "Bearer " prefix
   * @throws Error if header format is invalid
   */
  extractTokenFromHeader(authHeader: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header format. Expected: Bearer <token>');
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix
    if (!token) {
      throw new Error('No token provided in authorization header');
    }

    return token;
  }

  /**
   * Decodes a token without verifying it (useful for debugging)
   * @param token The JWT token to decode
   * @returns Decoded token payload or null if invalid
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Checks if a token is expired without verifying signature
   * @param token The JWT token to check
   * @returns True if token is expired, false otherwise
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  }

  /**
   * Converts expiry string to seconds
   * @param expiry Expiry string (e.g., "1h", "7d", "30m")
   * @returns Expiry time in seconds
   */
  private getExpirationTime(expiry: string): number {
    // Simple parser for common time formats
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default to 1 hour
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 3600;
    }
  }
}