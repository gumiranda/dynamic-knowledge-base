import { randomUUID } from 'crypto';

/**
 * Utility functions for entity management
 */
export class EntityUtils {
  /**
   * Generates a unique identifier using UUID v4
   * @returns A unique string identifier
   */
  static generateId(): string {
    return randomUUID();
  }

  /**
   * Validates if a string is a valid UUID format
   * @param id The ID to validate
   * @returns True if the ID is a valid UUID, false otherwise
   */
  static isValidId(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Validates if an ID exists and is not empty
   * @param id The ID to check
   * @returns True if ID is valid and not empty
   */
  static isNonEmptyId(id?: string): boolean {
    return Boolean(id && id.trim().length > 0);
  }

  /**
   * Creates a timestamp for entity creation/update
   * @returns Current date and time
   */
  static createTimestamp(): Date {
    return new Date();
  }

  /**
   * Validates if a date is valid and not in the future
   * @param date The date to validate
   * @returns True if date is valid and not in future
   */
  static isValidTimestamp(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime()) && date <= new Date();
  }
}
