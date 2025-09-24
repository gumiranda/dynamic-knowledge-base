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

}
