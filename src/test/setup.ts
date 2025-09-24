import 'reflect-metadata';

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = './data/test-database.json';
});

afterAll(() => {
  // Cleanup after all tests
});

// Global test utilities
global.console = {
  ...console,
  // Suppress logs during tests unless explicitly needed
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
