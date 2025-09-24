import { EntityUtils } from '../utils/EntityUtils';

/**
 * Abstract base class for all domain entities
 * Provides common properties and validation methods
 */
export abstract class BaseEntity {
  abstract id: string;
  abstract createdAt: Date;
  abstract updatedAt: Date;

  constructor() {
    // Base entity constructor
  }

  /**
   * Validates the entity's basic properties
   * @returns True if entity is valid, false otherwise
   */
  isValid(): boolean {
    return (
      EntityUtils.isNonEmptyId(this.id) &&
      EntityUtils.isValidTimestamp(this.createdAt) &&
      EntityUtils.isValidTimestamp(this.updatedAt) &&
      this.createdAt <= this.updatedAt
    );
  }

  /**
   * Updates the entity's updatedAt timestamp
   */
  protected updateTimestamp(): void {
    this.updatedAt = EntityUtils.createTimestamp();
  }

  /**
   * Gets the entity's age in milliseconds
   * @returns Age of entity since creation
   */
  getAge(): number {
    return Date.now() - this.createdAt.getTime();
  }

  /**
   * Checks if the entity was recently created (within last hour)
   * @returns True if created within the last hour
   */
  isRecentlyCreated(): boolean {
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    return this.getAge() < oneHour;
  }
}
