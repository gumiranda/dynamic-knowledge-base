export class TestHelpers {
  static generateUniqueId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static createMockDate(dateString?: string): Date {
    return dateString
      ? new Date(dateString)
      : new Date('2023-01-01T00:00:00.000Z');
  }

  static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generates a random string of specified length
   */
  static generateRandomString(length: number = 10): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generates a random email address
   */
  static generateRandomEmail(domain: string = 'test.com'): string {
    const username = this.generateRandomString(8).toLowerCase();
    return `${username}@${domain}`;
  }

  /**
   * Generates a random URL
   */
  static generateRandomUrl(
    protocol: string = 'https',
    domain: string = 'example.com'
  ): string {
    const path = this.generateRandomString(10).toLowerCase();
    return `${protocol}://${domain}/${path}`;
  }

  /**
   * Creates a date in the past
   */
  static createPastDate(daysAgo: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  }

  /**
   * Creates a date in the future
   */
  static createFutureDate(daysFromNow: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  }

  /**
   * Waits for a condition to be true
   */
  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeoutMs: number = 5000,
    intervalMs: number = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (await condition()) {
        return;
      }
      await this.delay(intervalMs);
    }

    throw new Error(`Condition not met within ${timeoutMs}ms`);
  }

  /**
   * Retries an operation until it succeeds or max attempts reached
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < maxAttempts) {
          await this.delay(delayMs);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Captures console output during test execution
   */
  static captureConsoleOutput<T>(
    fn: () => T | Promise<T>
  ): Promise<{ result: T; logs: string[]; errors: string[]; warns: string[] }> {
    const logs: string[] = [];
    const errors: string[] = [];
    const warns: string[] = [];

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => errors.push(args.join(' '));
    console.warn = (...args) => warns.push(args.join(' '));

    return Promise.resolve(fn()).then(
      (result) => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
        return { result, logs, errors, warns };
      },
      (error) => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
        throw error;
      }
    );
  }

  /**
   * Creates a temporary directory for test files
   */
  static async createTempDirectory(prefix: string = 'test'): Promise<{
    path: string;
    cleanup: () => Promise<void>;
  }> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));

    const cleanup = async () => {
      try {
        await fs.rmdir(tempDir, { recursive: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    };

    return { path: tempDir, cleanup };
  }

  /**
   * Validates that an object matches expected structure
   */
  static validateObjectStructure(
    obj: any,
    expectedStructure: Record<string, string | ((value: any) => boolean)>
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    Object.entries(expectedStructure).forEach(([key, validator]) => {
      if (!(key in obj)) {
        errors.push(`Missing property: ${key}`);
        return;
      }

      if (typeof validator === 'string') {
        if (typeof obj[key] !== validator) {
          errors.push(
            `Property ${key} should be ${validator}, got ${typeof obj[key]}`
          );
        }
      } else if (typeof validator === 'function') {
        if (!validator(obj[key])) {
          errors.push(`Property ${key} failed validation`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Deep clones an object for test isolation
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Compares two objects for deep equality
   */
  static deepEqual(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  /**
   * Creates a spy that tracks method calls
   */
  static createMethodSpy<T extends Record<string, any>>(
    obj: T,
    methodName: keyof T
  ): {
    spy: jest.SpyInstance;
    restore: () => void;
    getCalls: () => any[][];
  } {
    const originalMethod = obj[methodName];
    const calls: any[][] = [];

    const spy = jest
      .spyOn(obj, methodName as any)
      .mockImplementation((...args) => {
        calls.push(args);
        return originalMethod.apply(obj, args);
      });

    const restore = () => {
      spy.mockRestore();
    };

    const getCalls = () => [...calls];

    return { spy, restore, getCalls };
  }

  /**
   * Asserts that an async function throws a specific error
   */
  static async expectAsyncError(
    fn: () => Promise<any>,
    expectedError?: string | RegExp | Error
  ): Promise<Error> {
    try {
      await fn();
      throw new Error('Expected function to throw, but it did not');
    } catch (error) {
      if (expectedError) {
        if (typeof expectedError === 'string') {
          expect(error).toHaveProperty('message', expectedError);
        } else if (expectedError instanceof RegExp) {
          expect((error as Error).message).toMatch(expectedError);
        } else if (expectedError instanceof Error) {
          expect(error).toEqual(expectedError);
        }
      }
      return error as Error;
    }
  }
}
