export abstract class BaseEntity {
  abstract id: string;
  abstract createdAt: Date;
  abstract updatedAt: Date;

  constructor() {
    // Base entity constructor
  }
}