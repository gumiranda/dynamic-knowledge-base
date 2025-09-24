// Export all test utilities for easy importing
export { TestHelpers } from './TestHelpers';
export { MockFactories } from './MockFactories';
export { DatabaseTestUtils } from './DatabaseTestUtils';
export { ServiceMocks } from './ServiceMocks';
export { PerformanceTestUtils } from './PerformanceTestUtils';

// Re-export commonly used types for convenience
export type { ITopicRepository } from '../../domain/repositories/ITopicRepository';
export type { IResourceRepository } from '../../domain/repositories/IResourceRepository';
export type { IUserRepository } from '../../domain/repositories/IUserRepository';
export type { ITopicVersionFactory } from '../../domain/factories/ITopicVersionFactory';

// Export test data generators
export const TestData = {
  ...MockFactories,
  ...TestHelpers,
};

// Export performance testing utilities
export const Performance = PerformanceTestUtils;

// Export database utilities
export const Database = DatabaseTestUtils;

// Export service mocking utilities
export const Mocks = ServiceMocks;
