// Export test utilities
export { DatabaseTestUtils } from './DatabaseTestUtils';
export { JwtTestUtils } from './JwtTestUtils';
export { TestServer } from './TestServer';

// Re-export commonly used types for convenience
export type { ITopicRepository } from '../../domain/repositories/ITopicRepository';
export type { IResourceRepository } from '../../domain/repositories/IResourceRepository';
export type { IUserRepository } from '../../domain/repositories/IUserRepository';
export type { ITopicVersionFactory } from '../../domain/factories/ITopicVersionFactory';

// Export database utilities
import { DatabaseTestUtils } from './DatabaseTestUtils';

export const Database = DatabaseTestUtils;