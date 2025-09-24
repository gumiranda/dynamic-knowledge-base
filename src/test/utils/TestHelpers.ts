export class TestHelpers {
  static generateUniqueId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static createMockDate(dateString?: string): Date {
    return dateString ? new Date(dateString) : new Date('2023-01-01T00:00:00.000Z');
  }

  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}