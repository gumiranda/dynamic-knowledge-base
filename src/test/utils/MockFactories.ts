import { User } from '../../domain/entities/User';
import { Topic } from '../../domain/entities/Topic';
import { Resource } from '../../domain/entities/Resource';
import { UserRole } from '../../domain/enums/UserRole';
import { ResourceType } from '../../domain/enums/ResourceType';
import { TestHelpers } from './TestHelpers';

/**
 * Factory class for creating mock entities for testing
 */
export class MockFactories {
  /**
   * Creates a mock User with default or custom properties
   */
  static createUser(
    overrides: Partial<{
      name: string;
      email: string;
      role: UserRole;
      id: string;
      createdAt: Date;
      updatedAt: Date;
    }> = {}
  ): User {
    const defaults = {
      name: 'Test User',
      email: 'test@example.com',
      role: UserRole.VIEWER,
      id: TestHelpers.generateUniqueId(),
      createdAt: TestHelpers.createMockDate(),
      updatedAt: TestHelpers.createMockDate(),
    };

    return new User({ ...defaults, ...overrides });
  }

  /**
   * Creates a mock Admin User
   */
  static createAdminUser(
    overrides: Partial<{
      name: string;
      email: string;
      id: string;
    }> = {}
  ): User {
    return this.createUser({
      name: 'Admin User',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      ...overrides,
    });
  }

  /**
   * Creates a mock Editor User
   */
  static createEditorUser(
    overrides: Partial<{
      name: string;
      email: string;
      id: string;
    }> = {}
  ): User {
    return this.createUser({
      name: 'Editor User',
      email: 'editor@example.com',
      role: UserRole.EDITOR,
      ...overrides,
    });
  }

  /**
   * Creates a mock Viewer User
   */
  static createViewerUser(
    overrides: Partial<{
      name: string;
      email: string;
      id: string;
    }> = {}
  ): User {
    return this.createUser({
      name: 'Viewer User',
      email: 'viewer@example.com',
      role: UserRole.VIEWER,
      ...overrides,
    });
  }

  /**
   * Creates a mock Topic with default or custom properties
   */
  static createTopic(
    overrides: Partial<{
      name: string;
      content: string;
      parentTopicId: string;
      id: string;
      version: number;
      createdAt: Date;
      updatedAt: Date;
    }> = {}
  ): Topic {
    const defaults = {
      name: 'Test Topic',
      content: 'This is a test topic content',
      id: TestHelpers.generateUniqueId(),
      version: 1,
      createdAt: TestHelpers.createMockDate(),
      updatedAt: TestHelpers.createMockDate(),
    };

    return new Topic({ ...defaults, ...overrides });
  }

  /**
   * Creates a mock Resource with default or custom properties
   */
  static createResource(
    overrides: Partial<{
      topicId: string;
      url: string;
      description: string;
      type: ResourceType;
      id: string;
      createdAt: Date;
      updatedAt: Date;
    }> = {}
  ): Resource {
    const defaults = {
      topicId: TestHelpers.generateUniqueId(),
      url: 'https://example.com/test-resource',
      description: 'Test resource description',
      type: ResourceType.ARTICLE,
      id: TestHelpers.generateUniqueId(),
      createdAt: TestHelpers.createMockDate(),
      updatedAt: TestHelpers.createMockDate(),
    };

    return new Resource({ ...defaults, ...overrides });
  }

  /**
   * Creates a hierarchical topic structure for testing
   */
  static createTopicHierarchy(): {
    parent: Topic;
    children: Topic[];
    grandchildren: Topic[];
  } {
    const parent = this.createTopic({
      name: 'Parent Topic',
      content: 'This is the parent topic',
    });

    const children = [
      this.createTopic({
        name: 'Child Topic 1',
        content: 'First child topic',
        parentTopicId: parent.id,
      }),
      this.createTopic({
        name: 'Child Topic 2',
        content: 'Second child topic',
        parentTopicId: parent.id,
      }),
    ];

    const grandchildren = [
      this.createTopic({
        name: 'Grandchild Topic 1',
        content: 'First grandchild topic',
        parentTopicId: children[0].id,
      }),
      this.createTopic({
        name: 'Grandchild Topic 2',
        content: 'Second grandchild topic',
        parentTopicId: children[1].id,
      }),
    ];

    return { parent, children, grandchildren };
  }

  /**
   * Creates multiple users with different roles
   */
  static createUserSet(): {
    admin: User;
    editor: User;
    viewer: User;
    users: User[];
  } {
    const admin = this.createAdminUser();
    const editor = this.createEditorUser();
    const viewer = this.createViewerUser();

    return {
      admin,
      editor,
      viewer,
      users: [admin, editor, viewer],
    };
  }

  /**
   * Creates multiple resources of different types
   */
  static createResourceSet(topicId?: string): {
    article: Resource;
    video: Resource;
    pdf: Resource;
    document: Resource;
    resources: Resource[];
  } {
    const defaultTopicId = topicId || TestHelpers.generateUniqueId();

    const article = this.createResource({
      topicId: defaultTopicId,
      type: ResourceType.ARTICLE,
      url: 'https://example.com/article',
      description: 'Test article resource',
    });

    const video = this.createResource({
      topicId: defaultTopicId,
      type: ResourceType.VIDEO,
      url: 'https://example.com/video',
      description: 'Test video resource',
    });

    const pdf = this.createResource({
      topicId: defaultTopicId,
      type: ResourceType.PDF,
      url: 'https://example.com/document.pdf',
      description: 'Test PDF resource',
    });

    const document = this.createResource({
      topicId: defaultTopicId,
      type: ResourceType.DOCUMENT,
      url: 'https://example.com/document',
      description: 'Test document resource',
    });

    return {
      article,
      video,
      pdf,
      document,
      resources: [article, video, pdf, document],
    };
  }

  /**
   * Creates a complex scenario with topics and resources
   */
  static createComplexScenario(): {
    users: { admin: User; editor: User; viewer: User };
    topics: { parent: Topic; children: Topic[]; grandchildren: Topic[] };
    resources: Resource[];
  } {
    const users = this.createUserSet();
    const topics = this.createTopicHierarchy();

    // Create resources for each topic
    const resources: Resource[] = [];

    // Resources for parent topic
    const parentResources = this.createResourceSet(topics.parent.id);
    resources.push(...parentResources.resources);

    // Resources for child topics
    topics.children.forEach((child) => {
      const childResources = this.createResourceSet(child.id);
      resources.push(...childResources.resources.slice(0, 2)); // 2 resources per child
    });

    return { users, topics, resources };
  }

  /**
   * Creates test data for performance testing
   */
  static createPerformanceTestData(
    counts: {
      users?: number;
      topics?: number;
      resources?: number;
    } = {}
  ): {
    users: User[];
    topics: Topic[];
    resources: Resource[];
  } {
    const {
      users: userCount = 100,
      topics: topicCount = 500,
      resources: resourceCount = 1000,
    } = counts;

    const users: User[] = [];
    const topics: Topic[] = [];
    const resources: Resource[] = [];

    // Create users
    for (let i = 0; i < userCount; i++) {
      const role =
        i < 5 ? UserRole.ADMIN : i < 50 ? UserRole.EDITOR : UserRole.VIEWER;
      users.push(
        this.createUser({
          name: `Performance User ${i}`,
          email: `perfuser${i}@example.com`,
          role,
        })
      );
    }

    // Create topics with some hierarchy
    for (let i = 0; i < topicCount; i++) {
      const parentTopicId =
        i > 0 && Math.random() < 0.7
          ? topics[Math.floor(Math.random() * i)].id
          : undefined;
      topics.push(
        this.createTopic({
          name: `Performance Topic ${i}`,
          content: `Content for performance topic ${i}`,
          parentTopicId,
        })
      );
    }

    // Create resources
    for (let i = 0; i < resourceCount; i++) {
      const topicId = topics[Math.floor(Math.random() * topics.length)].id;
      const types = Object.values(ResourceType);
      const type = types[Math.floor(Math.random() * types.length)];

      resources.push(
        this.createResource({
          topicId,
          url: `https://example.com/perf-resource-${i}`,
          description: `Performance resource ${i}`,
          type,
        })
      );
    }

    return { users, topics, resources };
  }
}
