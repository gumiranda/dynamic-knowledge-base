# Design Document

## Overview

The Dynamic Knowledge Base System is designed as a layered RESTful API architecture that implements advanced object-oriented principles, design patterns, and complex business logic. The system manages versioned topics in a hierarchical structure with associated resources, user roles, and sophisticated algorithms for navigation and relationship discovery.

## Architecture

### High-Level Architecture

The system follows a clean architecture pattern with clear separation of concerns:

```
┌─────────────────┐
│   Controllers   │ ← HTTP Request/Response handling
├─────────────────┤
│    Services     │ ← Business Logic & Orchestration
├─────────────────┤
│   Repositories  │ ← Data Access Layer
├─────────────────┤
│     Models      │ ← Domain Entities & Interfaces
├─────────────────┤
│   Database      │ ← JSON File-based Storage
└─────────────────┘
```

### Core Design Patterns

1. **Factory Pattern**: Topic version creation and entity instantiation
2. **Strategy Pattern**: User permission handling and role-based access
3. **Composite Pattern**: Hierarchical topic structure management
4. **Repository Pattern**: Data access abstraction
5. **Dependency Injection**: Service composition and testability

## Components and Interfaces

### Domain Models

#### Abstract Base Entity

```typescript
abstract class BaseEntity {
  abstract id: string;
  abstract createdAt: Date;
  abstract updatedAt: Date;
}

interface IVersionable {
  version: number;
  createNewVersion(): IVersionable;
}

interface IHierarchical {
  parentId?: string;
  getChildren(): Promise<IHierarchical[]>;
  getParent(): Promise<IHierarchical | null>;
}
```

#### Topic Entity (Composite Pattern)

```typescript
class Topic extends BaseEntity implements IVersionable, IHierarchical {
  id: string;
  name: string;
  content: string;
  version: number;
  parentTopicId?: string;
  createdAt: Date;
  updatedAt: Date;

  // Composite pattern methods
  private children: Topic[] = [];

  addChild(topic: Topic): void;
  removeChild(topicId: string): void;
  getChildren(): Promise<Topic[]>;
  getParent(): Promise<Topic | null>;
}
```

#### Resource Entity

```typescript
enum ResourceType {
  VIDEO = "video",
  ARTICLE = "article",
  PDF = "pdf",
  DOCUMENT = "document",
}

class Resource extends BaseEntity {
  id: string;
  topicId: string;
  url: string;
  description: string;
  type: ResourceType;
  createdAt: Date;
  updatedAt: Date;
}
```

#### User Entity

```typescript
enum UserRole {
  ADMIN = "Admin",
  EDITOR = "Editor",
  VIEWER = "Viewer",
}

class User extends BaseEntity {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
```

### Factory Pattern Implementation

#### Topic Version Factory

```typescript
interface ITopicVersionFactory {
  createNewVersion(existingTopic: Topic, updates: Partial<Topic>): Topic;
}

class TopicVersionFactory implements ITopicVersionFactory {
  createNewVersion(existingTopic: Topic, updates: Partial<Topic>): Topic {
    return new Topic({
      ...existingTopic,
      ...updates,
      id: generateUniqueId(),
      version: existingTopic.version + 1,
      updatedAt: new Date(),
    });
  }
}
```

### Strategy Pattern Implementation

#### Permission Strategy

```typescript
interface IPermissionStrategy {
  canRead(user: User, resource: any): boolean;
  canWrite(user: User, resource: any): boolean;
  canDelete(user: User, resource: any): boolean;
}

class AdminPermissionStrategy implements IPermissionStrategy {
  canRead(): boolean {
    return true;
  }
  canWrite(): boolean {
    return true;
  }
  canDelete(): boolean {
    return true;
  }
}

class EditorPermissionStrategy implements IPermissionStrategy {
  canRead(): boolean {
    return true;
  }
  canWrite(): boolean {
    return true;
  }
  canDelete(): boolean {
    return false;
  }
}

class ViewerPermissionStrategy implements IPermissionStrategy {
  canRead(): boolean {
    return true;
  }
  canWrite(): boolean {
    return false;
  }
  canDelete(): boolean {
    return false;
  }
}

class PermissionContext {
  private strategy: IPermissionStrategy;

  constructor(user: User) {
    this.strategy = this.getStrategyForRole(user.role);
  }

  private getStrategyForRole(role: UserRole): IPermissionStrategy {
    switch (role) {
      case UserRole.ADMIN:
        return new AdminPermissionStrategy();
      case UserRole.EDITOR:
        return new EditorPermissionStrategy();
      case UserRole.VIEWER:
        return new ViewerPermissionStrategy();
    }
  }
}
```

### Repository Layer

#### Generic Repository Interface

```typescript
interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

interface ITopicRepository extends IRepository<Topic> {
  findByVersion(id: string, version: number): Promise<Topic | null>;
  findAllVersions(id: string): Promise<Topic[]>;
  findByParentId(parentId: string): Promise<Topic[]>;
  findRootTopics(): Promise<Topic[]>;
}
```

### Service Layer

#### Topic Service with Complex Business Logic

```typescript
class TopicService {
  constructor(
    private topicRepository: ITopicRepository,
    private versionFactory: ITopicVersionFactory,
    private permissionContext: PermissionContext
  ) {}

  async createTopic(topicData: CreateTopicDto, user: User): Promise<Topic> {
    if (!this.permissionContext.canWrite(user, null)) {
      throw new UnauthorizedError("Insufficient permissions");
    }

    // Validate hierarchical constraints
    if (topicData.parentTopicId) {
      await this.validateParentChild(topicData.parentTopicId, topicData.id);
    }

    return this.topicRepository.create(new Topic(topicData));
  }

  async updateTopic(
    id: string,
    updates: UpdateTopicDto,
    user: User
  ): Promise<Topic> {
    const existingTopic = await this.topicRepository.findById(id);
    if (!existingTopic) {
      throw new NotFoundError("Topic not found");
    }

    if (!this.permissionContext.canWrite(user, existingTopic)) {
      throw new UnauthorizedError("Insufficient permissions");
    }

    // Create new version using Factory pattern
    const newVersion = this.versionFactory.createNewVersion(
      existingTopic,
      updates
    );
    return this.topicRepository.create(newVersion);
  }

  async getTopicHierarchy(topicId: string): Promise<TopicHierarchyDto> {
    const rootTopic = await this.topicRepository.findById(topicId);
    if (!rootTopic) {
      throw new NotFoundError("Topic not found");
    }

    return this.buildHierarchyRecursively(rootTopic);
  }

  private async buildHierarchyRecursively(
    topic: Topic
  ): Promise<TopicHierarchyDto> {
    const children = await this.topicRepository.findByParentId(topic.id);
    const childHierarchies = await Promise.all(
      children.map((child) => this.buildHierarchyRecursively(child))
    );

    return {
      topic,
      children: childHierarchies,
    };
  }
}
```

## Data Models

### Database Schema (JSON Structure)

```typescript
interface DatabaseSchema {
  topics: {
    [id: string]: {
      versions: Topic[];
      currentVersion: number;
    };
  };
  resources: {
    [id: string]: Resource;
  };
  users: {
    [id: string]: User;
  };
  metadata: {
    lastTopicId: number;
    lastResourceId: number;
    lastUserId: number;
  };
}
```

### Custom Shortest Path Algorithm

```typescript
class TopicPathFinder {
  constructor(private topicRepository: ITopicRepository) {}

  async findShortestPath(
    startTopicId: string,
    endTopicId: string
  ): Promise<Topic[]> {
    // Build adjacency graph from topic hierarchy
    const graph = await this.buildTopicGraph();

    // Implement custom BFS algorithm
    const queue: Array<{ topicId: string; path: string[] }> = [
      {
        topicId: startTopicId,
        path: [startTopicId],
      },
    ];

    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.topicId === endTopicId) {
        // Convert path IDs to Topic objects
        return Promise.all(
          current.path.map((id) => this.topicRepository.findById(id))
        ).then((topics) => topics.filter(Boolean) as Topic[]);
      }

      if (visited.has(current.topicId)) {
        continue;
      }

      visited.add(current.topicId);

      // Add connected topics to queue
      const connections = graph.get(current.topicId) || [];
      for (const connectedId of connections) {
        if (!visited.has(connectedId)) {
          queue.push({
            topicId: connectedId,
            path: [...current.path, connectedId],
          });
        }
      }
    }

    return []; // No path found
  }

  private async buildTopicGraph(): Promise<Map<string, string[]>> {
    const allTopics = await this.topicRepository.findAll();
    const graph = new Map<string, string[]>();

    // Build bidirectional graph from parent-child relationships
    for (const topic of allTopics) {
      if (!graph.has(topic.id)) {
        graph.set(topic.id, []);
      }

      if (topic.parentTopicId) {
        // Add parent -> child connection
        if (!graph.has(topic.parentTopicId)) {
          graph.set(topic.parentTopicId, []);
        }
        graph.get(topic.parentTopicId)!.push(topic.id);

        // Add child -> parent connection
        graph.get(topic.id)!.push(topic.parentTopicId);
      }
    }

    return graph;
  }
}
```

## Error Handling

### Custom Error Classes

```typescript
abstract class AppError extends Error {
  abstract statusCode: number;
  abstract isOperational: boolean;
}

class ValidationError extends AppError {
  statusCode = 400;
  isOperational = true;
}

class NotFoundError extends AppError {
  statusCode = 404;
  isOperational = true;
}

class UnauthorizedError extends AppError {
  statusCode = 401;
  isOperational = true;
}
```

### Global Error Handler Middleware

```typescript
class ErrorHandler {
  static handle(error: Error, req: Request, res: Response, next: NextFunction) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: "error",
        message: error.message,
      });
    }

    // Log unexpected errors
    console.error("Unexpected error:", error);

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}
```

## Testing Strategy

### Unit Testing Approach

- **Models**: Test entity validation, business rules, and relationships
- **Services**: Test business logic with mocked dependencies
- **Repositories**: Test data access patterns with in-memory database
- **Controllers**: Test HTTP request/response handling with mocked services

### Integration Testing Approach

- **API Endpoints**: Test complete request/response cycles
- **User Workflows**: Test role-based access and permissions
- **Complex Algorithms**: Test shortest path and hierarchy retrieval
- **Version Control**: Test topic versioning and retrieval

### Test Structure

```typescript
describe("TopicService", () => {
  let topicService: TopicService;
  let mockRepository: jest.Mocked<ITopicRepository>;
  let mockVersionFactory: jest.Mocked<ITopicVersionFactory>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockVersionFactory = createMockVersionFactory();
    topicService = new TopicService(mockRepository, mockVersionFactory);
  });

  describe("createTopic", () => {
    it("should create topic with valid data", async () => {
      // Test implementation
    });

    it("should throw validation error for invalid data", async () => {
      // Test implementation
    });
  });
});
```

This design provides a robust foundation for implementing the Dynamic Knowledge Base System with all required advanced features, design patterns, and architectural principles.
