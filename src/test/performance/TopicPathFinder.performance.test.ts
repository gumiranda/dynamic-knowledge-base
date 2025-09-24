import { TopicPathFinder } from '../../application/services/TopicPathFinder';
import { ITopicRepository } from '../../domain/repositories/ITopicRepository';
import { Topic } from '../../domain/entities/Topic';
import { PerformanceTestUtils, MockFactories, TestHelpers } from '../utils';

describe('TopicPathFinder Performance Tests', () => {
  let pathFinder: TopicPathFinder;
  let mockRepository: jest.Mocked<ITopicRepository>;
  let testTopics: Topic[];

  beforeAll(() => {
    // Create mock repository
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByVersion: jest.fn(),
      findAllVersions: jest.fn(),
      findByParentId: jest.fn(),
      findRootTopics: jest.fn(),
      findLatestVersion: jest.fn(),
      getCurrentVersion: jest.fn(),
      exists: jest.fn(),
      findByName: jest.fn(),
      findByContent: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      isDeleted: jest.fn(),
    };

    pathFinder = new TopicPathFinder(mockRepository);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Algorithm Efficiency Tests', () => {
    it('should handle small graphs efficiently', async () => {
      // Create a small linear graph: A -> B -> C -> D -> E
      const topics = Array.from({ length: 5 }, (_, i) =>
        MockFactories.createTopic({
          name: `Topic ${String.fromCharCode(65 + i)}`,
          parentTopicId: i > 0 ? `topic-${i - 1}` : undefined,
          id: `topic-${i}`,
        })
      );

      mockRepository.findAll.mockResolvedValue(topics);
      mockRepository.findLatestVersion
        .mockResolvedValueOnce(topics[0]) // start topic
        .mockResolvedValueOnce(topics[4]) // end topic
        .mockResolvedValueOnce(topics[0]) // path conversion
        .mockResolvedValueOnce(topics[1])
        .mockResolvedValueOnce(topics[2])
        .mockResolvedValueOnce(topics[3])
        .mockResolvedValueOnce(topics[4]);

      const result = await PerformanceTestUtils.measureExecutionTime(
        () => pathFinder.findShortestPath('topic-0', 'topic-4'),
        10
      );

      expect(result.averageTime).toBeLessThan(10); // Should be very fast for small graphs
      expect(result.result).toHaveLength(5);
    });

    it('should scale well with graph size', async () => {
      const inputSizes = [10, 50, 100, 200];

      const results = await PerformanceTestUtils.testAlgorithmEfficiency(
        async (size) => {
          // Create a linear graph of specified size
          const topics = Array.from({ length: size }, (_, i) =>
            MockFactories.createTopic({
              name: `Topic ${i}`,
              parentTopicId: i > 0 ? `topic-${i - 1}` : undefined,
              id: `topic-${i}`,
            })
          );

          mockRepository.findAll.mockResolvedValue(topics);
          mockRepository.findLatestVersion
            .mockResolvedValueOnce(topics[0])
            .mockResolvedValueOnce(topics[size - 1]);

          // Mock path conversion
          for (let i = 0; i < size; i++) {
            mockRepository.findLatestVersion.mockResolvedValueOnce(topics[i]);
          }

          return await pathFinder.findShortestPath(
            'topic-0',
            `topic-${size - 1}`
          );
        },
        inputSizes,
        { iterations: 3, timeoutMs: 10000 }
      );

      // Verify all tests completed successfully
      results.forEach((result) => {
        expect(result.successful).toBe(true);
      });

      // Check that algorithm scales reasonably (should be linear or better)
      const largestResult = results[results.length - 1];
      expect(largestResult.timeComplexity).toMatch(/O\((1|log n|n)\)/);
    });

    it('should handle disconnected graphs efficiently', async () => {
      // Create two separate components
      const component1 = Array.from({ length: 50 }, (_, i) =>
        MockFactories.createTopic({
          name: `Component1-Topic ${i}`,
          parentTopicId: i > 0 ? `comp1-topic-${i - 1}` : undefined,
          id: `comp1-topic-${i}`,
        })
      );

      const component2 = Array.from({ length: 50 }, (_, i) =>
        MockFactories.createTopic({
          name: `Component2-Topic ${i}`,
          parentTopicId: i > 0 ? `comp2-topic-${i - 1}` : undefined,
          id: `comp2-topic-${i}`,
        })
      );

      const allTopics = [...component1, ...component2];

      mockRepository.findAll.mockResolvedValue(allTopics);
      mockRepository.findLatestVersion
        .mockResolvedValueOnce(component1[0])
        .mockResolvedValueOnce(component2[0]);

      const result = await PerformanceTestUtils.measureExecutionTime(
        () => pathFinder.findShortestPath('comp1-topic-0', 'comp2-topic-0'),
        5
      );

      expect(result.averageTime).toBeLessThan(50); // Should quickly determine no path exists
      expect(result.result).toHaveLength(0); // No path between disconnected components
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory during path finding', async () => {
      // Create a moderate-sized graph
      const topics = Array.from({ length: 100 }, (_, i) =>
        MockFactories.createTopic({
          name: `Memory Test Topic ${i}`,
          parentTopicId: i > 0 ? `mem-topic-${i - 1}` : undefined,
          id: `mem-topic-${i}`,
        })
      );

      mockRepository.findAll.mockResolvedValue(topics);
      mockRepository.findLatestVersion
        .mockResolvedValueOnce(topics[0])
        .mockResolvedValueOnce(topics[99]);

      // Mock path conversion
      for (let i = 0; i < 100; i++) {
        mockRepository.findLatestVersion.mockResolvedValueOnce(topics[i]);
      }

      const memoryResult = await PerformanceTestUtils.measureMemoryUsage(
        async () => {
          // Run multiple path finding operations
          const promises = Array.from({ length: 10 }, () =>
            pathFinder.findShortestPath('mem-topic-0', 'mem-topic-99')
          );
          return await Promise.all(promises);
        }
      );

      // Memory usage should be reasonable (less than 10MB for this test)
      const memoryUsageMB =
        memoryResult.memoryUsage.delta.heapUsed / (1024 * 1024);
      expect(memoryUsageMB).toBeLessThan(10);
    });
  });

  describe('Caching Performance Tests', () => {
    it('should improve performance with caching enabled', async () => {
      const cachedPathFinder = new TopicPathFinder(mockRepository, {
        cacheEnabled: true,
        cacheMaxSize: 100,
      });

      const topics = Array.from({ length: 20 }, (_, i) =>
        MockFactories.createTopic({
          name: `Cache Test Topic ${i}`,
          parentTopicId: i > 0 ? `cache-topic-${i - 1}` : undefined,
          id: `cache-topic-${i}`,
        })
      );

      mockRepository.findAll.mockResolvedValue(topics);

      const scenarios = [
        {
          name: 'First call (no cache)',
          fn: async () => {
            mockRepository.findLatestVersion
              .mockResolvedValueOnce(topics[0])
              .mockResolvedValueOnce(topics[19]);

            // Mock path conversion
            for (let i = 0; i < 20; i++) {
              mockRepository.findLatestVersion.mockResolvedValueOnce(topics[i]);
            }

            return await cachedPathFinder.findShortestPath(
              'cache-topic-0',
              'cache-topic-19'
            );
          },
        },
        {
          name: 'Second call (cached)',
          fn: async () => {
            // Mock path conversion only (should use cached path)
            for (let i = 0; i < 20; i++) {
              mockRepository.findLatestVersion.mockResolvedValueOnce(topics[i]);
            }

            return await cachedPathFinder.findShortestPath(
              'cache-topic-0',
              'cache-topic-19'
            );
          },
        },
      ];

      const results = await PerformanceTestUtils.runBenchmark(scenarios, {
        warmupIterations: 1,
      });

      // Second call should be faster due to caching
      expect(results[1].performance.averageTime).toBeLessThan(
        results[0].performance.averageTime
      );
    });

    it('should handle cache eviction properly', async () => {
      const smallCachePathFinder = new TopicPathFinder(mockRepository, {
        cacheEnabled: true,
        cacheMaxSize: 2, // Very small cache
      });

      const topics = Array.from({ length: 10 }, (_, i) =>
        MockFactories.createTopic({
          name: `Eviction Test Topic ${i}`,
          id: `evict-topic-${i}`,
        })
      );

      mockRepository.findAll.mockResolvedValue(topics);

      // Fill cache beyond capacity
      for (let i = 0; i < 5; i++) {
        mockRepository.findLatestVersion
          .mockResolvedValueOnce(topics[0])
          .mockResolvedValueOnce(topics[i])
          .mockResolvedValueOnce(topics[0])
          .mockResolvedValueOnce(topics[i]);

        await smallCachePathFinder.findShortestPath(
          'evict-topic-0',
          `evict-topic-${i}`
        );
      }

      const stats = smallCachePathFinder.getCacheStats();
      expect(stats.pathCacheSize).toBeLessThanOrEqual(2);
    });
  });

  describe('Concurrent Access Tests', () => {
    it('should handle concurrent path finding requests', async () => {
      const topics = Array.from({ length: 50 }, (_, i) =>
        MockFactories.createTopic({
          name: `Concurrent Test Topic ${i}`,
          parentTopicId: i > 0 ? `conc-topic-${i - 1}` : undefined,
          id: `conc-topic-${i}`,
        })
      );

      mockRepository.findAll.mockResolvedValue(topics);

      const loadTestResult = await PerformanceTestUtils.runLoadTest(
        async () => {
          const startIdx = Math.floor(Math.random() * 40);
          const endIdx = startIdx + Math.floor(Math.random() * 10);

          mockRepository.findLatestVersion
            .mockResolvedValueOnce(topics[startIdx])
            .mockResolvedValueOnce(topics[endIdx]);

          // Mock path conversion
          for (let i = startIdx; i <= endIdx; i++) {
            mockRepository.findLatestVersion.mockResolvedValueOnce(topics[i]);
          }

          return await pathFinder.findShortestPath(
            `conc-topic-${startIdx}`,
            `conc-topic-${endIdx}`
          );
        },
        {
          concurrentUsers: 10,
          operationsPerUser: 5,
          rampUpTimeMs: 100,
        }
      );

      expect(loadTestResult.successfulOperations).toBe(50);
      expect(loadTestResult.failedOperations).toBe(0);
      expect(loadTestResult.averageResponseTime).toBeLessThan(100);
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle deep hierarchies efficiently', async () => {
      // Create a very deep linear hierarchy
      const depth = 1000;
      const topics = Array.from({ length: depth }, (_, i) =>
        MockFactories.createTopic({
          name: `Deep Topic ${i}`,
          parentTopicId: i > 0 ? `deep-topic-${i - 1}` : undefined,
          id: `deep-topic-${i}`,
        })
      );

      mockRepository.findAll.mockResolvedValue(topics);
      mockRepository.findLatestVersion
        .mockResolvedValueOnce(topics[0])
        .mockResolvedValueOnce(topics[depth - 1]);

      // Mock path conversion
      for (let i = 0; i < depth; i++) {
        mockRepository.findLatestVersion.mockResolvedValueOnce(topics[i]);
      }

      const result = await PerformanceTestUtils.measureExecutionTime(
        () =>
          pathFinder.findShortestPath(
            'deep-topic-0',
            `deep-topic-${depth - 1}`
          ),
        3
      );

      expect(result.averageTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.result).toHaveLength(depth);
    });

    it('should handle wide hierarchies efficiently', async () => {
      // Create a wide hierarchy (one parent with many children)
      const width = 500;
      const parent = MockFactories.createTopic({
        name: 'Wide Parent',
        id: 'wide-parent',
      });

      const children = Array.from({ length: width }, (_, i) =>
        MockFactories.createTopic({
          name: `Wide Child ${i}`,
          parentTopicId: 'wide-parent',
          id: `wide-child-${i}`,
        })
      );

      const allTopics = [parent, ...children];

      mockRepository.findAll.mockResolvedValue(allTopics);
      mockRepository.findLatestVersion
        .mockResolvedValueOnce(children[0])
        .mockResolvedValueOnce(children[width - 1]);

      // Mock path conversion (should go through parent)
      mockRepository.findLatestVersion
        .mockResolvedValueOnce(children[0])
        .mockResolvedValueOnce(parent)
        .mockResolvedValueOnce(children[width - 1]);

      const result = await PerformanceTestUtils.measureExecutionTime(
        () =>
          pathFinder.findShortestPath(
            'wide-child-0',
            `wide-child-${width - 1}`
          ),
        3
      );

      expect(result.averageTime).toBeLessThan(500); // Should be reasonably fast
      expect(result.result).toHaveLength(3); // child -> parent -> child
    });
  });

  afterAll(() => {
    // Clean up any resources
    pathFinder.clearCache();
  });
});
