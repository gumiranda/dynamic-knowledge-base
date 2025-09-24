import { BaseEntity } from './BaseEntity';
import { IVersionable } from '../interfaces/IVersionable';
import { IHierarchical } from '../interfaces/IHierarchical';
import { EntityUtils } from '../utils/EntityUtils';

/**
 * Topic entity implementing Composite pattern for hierarchical structure
 * and version control for content management
 */
export class Topic extends BaseEntity implements IVersionable, IHierarchical {
  id: string;
  name: string;
  content: string;
  version: number;
  parentTopicId?: string;
  createdAt: Date;
  updatedAt: Date;

  // Composite pattern - children collection
  private children: Topic[] = [];

  constructor(data: {
    name: string;
    content: string;
    parentTopicId?: string;
    id?: string;
    version?: number;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super();

    this.id = data.id || EntityUtils.generateId();
    this.name = data.name;
    this.content = data.content;
    this.version = data.version || 1;
    this.parentTopicId = data.parentTopicId;
    this.createdAt = data.createdAt || EntityUtils.createTimestamp();
    this.updatedAt = data.updatedAt || EntityUtils.createTimestamp();
  }

  /**
   * Validates the topic entity
   * @returns True if topic is valid, false otherwise
   */
  isValid(): boolean {
    return (
      super.isValid() &&
      this.isValidName() &&
      this.isValidContent() &&
      this.isValidVersion() &&
      this.isValidParentId()
    );
  }

  /**
   * Validates the topic name
   * @returns True if name is valid
   */
  isValidName(): boolean {
    return (
      typeof this.name === 'string' &&
      this.name.trim().length >= 1 &&
      this.name.trim().length <= 200
    );
  }

  /**
   * Validates the topic content
   * @returns True if content is valid
   */
  isValidContent(): boolean {
    return (
      typeof this.content === 'string' && this.content.length <= 10000 // Max 10k characters
    );
  }

  /**
   * Validates the version number
   * @returns True if version is valid
   */
  isValidVersion(): boolean {
    return (
      typeof this.version === 'number' &&
      this.version >= 1 &&
      Number.isInteger(this.version)
    );
  }

  /**
   * Validates the parent topic ID
   * @returns True if parent ID is valid or undefined
   */
  isValidParentId(): boolean {
    return (
      this.parentTopicId === undefined ||
      (typeof this.parentTopicId === 'string' &&
        EntityUtils.isNonEmptyId(this.parentTopicId) &&
        this.parentTopicId !== this.id) // Prevent self-reference
    );
  }

  // IVersionable implementation
  /**
   * Creates a new version of this topic with updated content
   * @returns New Topic instance with incremented version
   */
  createNewVersion(): Topic {
    return new Topic({
      name: this.name,
      content: this.content,
      parentTopicId: this.parentTopicId,
      version: this.version + 1,
      createdAt: this.createdAt, // Keep original creation date
      updatedAt: EntityUtils.createTimestamp(),
    });
  }

  // IHierarchical implementation
  /**
   * Gets the parent ID for hierarchical relationships
   */
  get parentId(): string | undefined {
    return this.parentTopicId;
  }

  /**
   * Gets all child topics (Composite pattern)
   * @returns Promise resolving to array of child topics
   */
  async getChildren(): Promise<Topic[]> {
    // Return a copy to prevent external modification
    return [...this.children];
  }

  /**
   * Gets the parent topic (would typically involve repository lookup)
   * @returns Promise resolving to parent topic or null
   */
  async getParent(): Promise<Topic | null> {
    // This would typically involve a repository lookup
    // For now, return null as this requires external dependency
    return null;
  }

  // Composite pattern methods
  /**
   * Adds a child topic to this topic
   * @param child The child topic to add
   */
  addChild(child: Topic): void {
    if (!child) {
      throw new Error('Child topic cannot be null or undefined');
    }

    if (child.id === this.id) {
      throw new Error('Cannot add topic as child of itself');
    }

    if (this.hasChild(child.id)) {
      throw new Error('Child topic already exists');
    }

    // Prevent circular references by checking if this topic is already a descendant
    if (this.isDescendantOf(child)) {
      throw new Error('Cannot add child: would create circular reference');
    }

    // Set parent relationship
    child.parentTopicId = this.id;
    child.updateTimestamp();

    // Add to children collection
    this.children.push(child);
  }

  /**
   * Removes a child topic from this topic
   * @param childId The ID of the child topic to remove
   * @returns True if child was removed, false if not found
   */
  removeChild(childId: string): boolean {
    const initialLength = this.children.length;
    this.children = this.children.filter((child) => {
      if (child.id === childId) {
        child.parentTopicId = undefined;
        child.updateTimestamp();
        return false;
      }
      return true;
    });

    return this.children.length < initialLength;
  }

  /**
   * Checks if this topic has a specific child
   * @param childId The ID of the child to check
   * @returns True if child exists
   */
  hasChild(childId: string): boolean {
    return this.children.some((child) => child.id === childId);
  }

  /**
   * Gets all descendants recursively (Composite pattern)
   * @returns Array of all descendant topics
   */
  getAllDescendants(): Topic[] {
    const descendants: Topic[] = [];

    for (const child of this.children) {
      descendants.push(child);
      descendants.push(...child.getAllDescendants());
    }

    return descendants;
  }

  /**
   * Checks if this topic is a descendant of another topic
   * @param potentialAncestor The potential ancestor topic
   * @returns True if this topic is a descendant
   */
  isDescendantOf(potentialAncestor: Topic): boolean {
    if (!this.parentTopicId) {
      return false;
    }

    if (this.parentTopicId === potentialAncestor.id) {
      return true;
    }

    // This would require repository lookup for full implementation
    // For now, we can only check direct parent
    return false;
  }

  /**
   * Gets the depth level in the hierarchy (0 for root topics)
   * @returns The depth level
   */
  getDepthLevel(): number {
    if (!this.parentTopicId) {
      return 0;
    }

    // This would require repository lookup for full implementation
    // For now, return 1 if has parent, 0 if root
    return 1;
  }

  /**
   * Checks if this is a root topic (no parent)
   * @returns True if this is a root topic
   */
  isRoot(): boolean {
    return !this.parentTopicId;
  }

  /**
   * Checks if this is a leaf topic (no children)
   * @returns True if this is a leaf topic
   */
  isLeaf(): boolean {
    return this.children.length === 0;
  }

  /**
   * Gets the number of direct children
   * @returns Number of direct children
   */
  getChildCount(): number {
    return this.children.length;
  }

  /**
   * Gets the total number of descendants
   * @returns Total number of descendants
   */
  getDescendantCount(): number {
    return this.getAllDescendants().length;
  }

  // Update methods
  /**
   * Updates the topic name
   * @param newName The new name
   */
  updateName(newName: string): void {
    if (!newName || typeof newName !== 'string') {
      throw new Error('Invalid name provided');
    }

    const trimmedName = newName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 200) {
      throw new Error('Name must be between 1 and 200 characters');
    }

    this.name = trimmedName;
    this.updateTimestamp();
  }

  /**
   * Updates the topic content
   * @param newContent The new content
   */
  updateContent(newContent: string): void {
    if (typeof newContent !== 'string') {
      throw new Error('Invalid content provided');
    }

    if (newContent.length > 10000) {
      throw new Error('Content cannot exceed 10,000 characters');
    }

    this.content = newContent;
    this.updateTimestamp();
  }

  /**
   * Updates the parent topic ID
   * @param newParentId The new parent topic ID
   */
  updateParent(newParentId?: string): void {
    if (newParentId !== undefined) {
      if (!EntityUtils.isNonEmptyId(newParentId)) {
        throw new Error('Invalid parent ID provided');
      }

      if (newParentId === this.id) {
        throw new Error('Topic cannot be its own parent');
      }
    }

    this.parentTopicId = newParentId;
    this.updateTimestamp();
  }

  /**
   * Creates a safe representation of the topic for serialization
   * @returns Topic object without circular references
   */
  toSafeObject(): Omit<Topic, 'children' | 'updateTimestamp'> & {
    childIds: string[];
  } {
    return {
      id: this.id,
      name: this.name,
      content: this.content,
      version: this.version,
      parentTopicId: this.parentTopicId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      childIds: this.children.map((child) => child.id),
      isValid: this.isValid.bind(this),
      isValidName: this.isValidName.bind(this),
      isValidContent: this.isValidContent.bind(this),
      isValidVersion: this.isValidVersion.bind(this),
      isValidParentId: this.isValidParentId.bind(this),
      createNewVersion: this.createNewVersion.bind(this),
      getChildren: this.getChildren.bind(this),
      getParent: this.getParent.bind(this),
      addChild: this.addChild.bind(this),
      removeChild: this.removeChild.bind(this),
      hasChild: this.hasChild.bind(this),
      getAllDescendants: this.getAllDescendants.bind(this),
      isDescendantOf: this.isDescendantOf.bind(this),
      getDepthLevel: this.getDepthLevel.bind(this),
      isRoot: this.isRoot.bind(this),
      isLeaf: this.isLeaf.bind(this),
      getChildCount: this.getChildCount.bind(this),
      getDescendantCount: this.getDescendantCount.bind(this),
      updateName: this.updateName.bind(this),
      updateContent: this.updateContent.bind(this),
      updateParent: this.updateParent.bind(this),
      toSafeObject: this.toSafeObject.bind(this),
      getAge: this.getAge.bind(this),
      isRecentlyCreated: this.isRecentlyCreated.bind(this),
      parentId: this.parentId,
    };
  }
}
