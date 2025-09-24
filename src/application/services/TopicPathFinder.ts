import { Topic } from '../../domain/entities/Topic';
import { ITopicRepository } from '../../domain/repositories/ITopicRepository';

/**
 * Cache entry for storing path results
 */
interface PathCacheEntry {
  path: string[];
  timestamp: number;
  accessCount: number;
}

/**
 * Configuration options for TopicPathFinder
 */
interface PathFinderOptions {
  cacheEnabled?: boolean;
  cacheMaxSize?: number;
  cacheTTL?: number; // Time to live in milliseconds
  maxSearchDepth?: number;
  enableBidirectionalSearch?: boolean;
}

/**
 * Service for finding shortest paths between topics using optimized BFS algorithm
 * Implements bidirectional graph traversal, caching, and performance optimizations
 * for hierarchical topic relationships
 */
export class TopicPathFinder {
  private pathCache: Map<string, PathCacheEntry> = new Map();
  private graphCache: Map<string, string[]> | null = null;
  private graphCacheTimestamp: number = 0;
  private readonly options: Required<PathFinderOptions>;

  // Performance optimization constants
  private static readonly DEFAULT_CACHE_MAX_SIZE = 1000;
  private static readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly DEFAULT_MAX_SEARCH_DEPTH = 50;
  private static readonly GRAPH_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  constructor(
    private topicRepository: ITopicRepository,
    options: PathFinderOptions = {}
  ) {
    this.options = {
      cacheEnabled: options.cacheEnabled ?? true,
      cacheMaxSize:
        options.cacheMaxSize ?? TopicPathFinder.DEFAULT_CACHE_MAX_SIZE,
      cacheTTL: options.cacheTTL ?? TopicPathFinder.DEFAULT_CACHE_TTL,
      maxSearchDepth:
        options.maxSearchDepth ?? TopicPathFinder.DEFAULT_MAX_SEARCH_DEPTH,
      enableBidirectionalSearch: options.enableBidirectionalSearch ?? true,
    };
  }

  /**
   * Finds the shortest path between two topics using optimized BFS algorithm with caching
   * @param startTopicId The starting topic ID
   * @param endTopicId The ending topic ID
   * @returns Promise resolving to array of topics representing the shortest path
   */
  async findShortestPath(
    startTopicId: string,
    endTopicId: string
  ): Promise<Topic[]> {
    // Validate input parameters
    this.validateTopicIds(startTopicId, endTopicId);

    // Check cache first if enabled (before same topic check to test caching)
    if (this.options.cacheEnabled) {
      const cachedPath = this.getCachedPath(startTopicId, endTopicId);
      if (cachedPath) {
        return this.convertPathToTopics(cachedPath);
      }
    }

    if (startTopicId === endTopicId) {
      const topic = await this.topicRepository.findLatestVersion(startTopicId);
      if (!topic) {
        throw new Error('Topic not found');
      }

      // Cache single topic result
      if (this.options.cacheEnabled) {
        this.cachePathResult(startTopicId, endTopicId, [startTopicId]);
      }

      return [topic];
    }

    // Verify both topics exist
    await this.validateTopicsExist(startTopicId, endTopicId);

    // Build or get cached topic graph
    const graph = await this.getOptimizedTopicGraph();

    // Use optimized algorithm to find shortest path
    const pathIds = this.options.enableBidirectionalSearch
      ? await this.performBidirectionalBFS(graph, startTopicId, endTopicId)
      : await this.performOptimizedBFS(graph, startTopicId, endTopicId);

    // Cache the result if enabled
    if (this.options.cacheEnabled && pathIds.length > 0) {
      this.cachePathResult(startTopicId, endTopicId, pathIds);
    }

    if (pathIds.length === 0) {
      return []; // No path found - topics are disconnected
    }

    // Convert path IDs to Topic objects
    return this.convertPathToTopics(pathIds);
  }

  /**
   * Gets optimized topic graph with caching
   * @returns Promise resolving to cached or newly built graph
   */
  private async getOptimizedTopicGraph(): Promise<Map<string, string[]>> {
    const now = Date.now();

    // Return cached graph if still valid
    if (
      this.graphCache &&
      now - this.graphCacheTimestamp < TopicPathFinder.GRAPH_CACHE_TTL
    ) {
      return this.graphCache;
    }

    // Build new graph and cache it
    this.graphCache = await this.buildTopicGraph();
    this.graphCacheTimestamp = now;

    return this.graphCache;
  }

  /**
   * Builds a bidirectional graph from topic hierarchical relationships
   * @returns Promise resolving to adjacency list representation of the topic graph
   */
  private async buildTopicGraph(): Promise<Map<string, string[]>> {
    const allTopics = await this.topicRepository.findAll();
    const graph = new Map<string, string[]>();

    // Initialize graph with all topic IDs
    for (const topic of allTopics) {
      if (!graph.has(topic.id)) {
        graph.set(topic.id, []);
      }
    }

    // Build bidirectional connections from parent-child relationships
    for (const topic of allTopics) {
      if (topic.parentTopicId) {
        // Ensure parent exists in graph
        if (!graph.has(topic.parentTopicId)) {
          graph.set(topic.parentTopicId, []);
        }

        // Add bidirectional connections
        // Parent -> Child connection
        const parentConnections = graph.get(topic.parentTopicId)!;
        if (!parentConnections.includes(topic.id)) {
          parentConnections.push(topic.id);
        }

        // Child -> Parent connection
        const childConnections = graph.get(topic.id)!;
        if (!childConnections.includes(topic.parentTopicId)) {
          childConnections.push(topic.parentTopicId);
        }
      }
    }

    return graph;
  }

  /**
   * Performs optimized BFS algorithm with depth limiting
   * @param graph The topic graph as adjacency list
   * @param startId Starting topic ID
   * @param endId Ending topic ID
   * @returns Array of topic IDs representing the shortest path
   */
  private async performOptimizedBFS(
    graph: Map<string, string[]>,
    startId: string,
    endId: string
  ): Promise<string[]> {
    // BFS queue: each item contains current topic ID and path to reach it
    const queue: Array<{ topicId: string; path: string[] }> = [
      {
        topicId: startId,
        path: [startId],
      },
    ];

    // Track visited nodes to prevent cycles
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Check depth limit to prevent excessive search
      if (current.path.length > this.options.maxSearchDepth) {
        continue;
      }

      // Check if we've reached the destination
      if (current.topicId === endId) {
        return current.path;
      }

      // Skip if already visited (prevents infinite loops)
      if (visited.has(current.topicId)) {
        continue;
      }

      // Mark as visited
      visited.add(current.topicId);

      // Get all connected topics (neighbors in the graph)
      const connections = graph.get(current.topicId) || [];

      // Add unvisited neighbors to the queue
      for (const connectedId of connections) {
        if (!visited.has(connectedId)) {
          queue.push({
            topicId: connectedId,
            path: [...current.path, connectedId],
          });
        }
      }
    }

    // No path found - topics are disconnected or exceed depth limit
    return [];
  }

  /**
   * Performs bidirectional BFS for improved performance on large graphs
   * @param graph The topic graph as adjacency list
   * @param startId Starting topic ID
   * @param endId Ending topic ID
   * @returns Array of topic IDs representing the shortest path
   */
  private async performBidirectionalBFS(
    graph: Map<string, string[]>,
    startId: string,
    endId: string
  ): Promise<string[]> {
    // Forward search from start
    const forwardQueue: Array<{ topicId: string; path: string[] }> = [
      { topicId: startId, path: [startId] },
    ];
    const forwardVisited = new Map<string, string[]>();
    forwardVisited.set(startId, [startId]);

    // Backward search from end
    const backwardQueue: Array<{ topicId: string; path: string[] }> = [
      { topicId: endId, path: [endId] },
    ];
    const backwardVisited = new Map<string, string[]>();
    backwardVisited.set(endId, [endId]);

    const maxDepthPerDirection = Math.floor(this.options.maxSearchDepth / 2);

    while (forwardQueue.length > 0 || backwardQueue.length > 0) {
      // Expand forward search
      if (forwardQueue.length > 0) {
        const current = forwardQueue.shift()!;

        if (current.path.length <= maxDepthPerDirection) {
          // Check if we've met the backward search
          if (backwardVisited.has(current.topicId)) {
            const backwardPath = backwardVisited.get(current.topicId)!;
            return this.mergeBidirectionalPaths(current.path, backwardPath);
          }

          const connections = graph.get(current.topicId) || [];
          for (const connectedId of connections) {
            if (!forwardVisited.has(connectedId)) {
              const newPath = [...current.path, connectedId];
              forwardVisited.set(connectedId, newPath);
              forwardQueue.push({ topicId: connectedId, path: newPath });
            }
          }
        }
      }

      // Expand backward search
      if (backwardQueue.length > 0) {
        const current = backwardQueue.shift()!;

        if (current.path.length <= maxDepthPerDirection) {
          // Check if we've met the forward search
          if (forwardVisited.has(current.topicId)) {
            const forwardPath = forwardVisited.get(current.topicId)!;
            return this.mergeBidirectionalPaths(forwardPath, current.path);
          }

          const connections = graph.get(current.topicId) || [];
          for (const connectedId of connections) {
            if (!backwardVisited.has(connectedId)) {
              const newPath = [...current.path, connectedId];
              backwardVisited.set(connectedId, newPath);
              backwardQueue.push({ topicId: connectedId, path: newPath });
            }
          }
        }
      }
    }

    // No path found
    return [];
  }

  /**
   * Merges paths from bidirectional search
   * @param forwardPath Path from start to meeting point
   * @param backwardPath Path from meeting point to end (in reverse)
   * @returns Complete path from start to end
   */
  private mergeBidirectionalPaths(
    forwardPath: string[],
    backwardPath: string[]
  ): string[] {
    // backwardPath is from end to meeting point, so we need to reverse it
    // and remove the duplicate meeting point
    const reversedBackward = [...backwardPath].reverse().slice(1);
    return [...forwardPath, ...reversedBackward];
  }

  /**
   * Validates topic IDs
   * @param startTopicId Starting topic ID
   * @param endTopicId Ending topic ID
   */
  private validateTopicIds(startTopicId: string, endTopicId: string): void {
    if (typeof startTopicId !== 'string' || typeof endTopicId !== 'string') {
      throw new Error('Topic IDs must be strings');
    }

    if (!startTopicId || !endTopicId) {
      throw new Error('Both start and end topic IDs are required');
    }

    if (startTopicId.trim() === '' || endTopicId.trim() === '') {
      throw new Error('Topic IDs cannot be empty strings');
    }
  }

  /**
   * Validates that both topics exist
   * @param startTopicId Starting topic ID
   * @param endTopicId Ending topic ID
   */
  private async validateTopicsExist(
    startTopicId: string,
    endTopicId: string
  ): Promise<void> {
    const [startTopic, endTopic] = await Promise.all([
      this.topicRepository.findLatestVersion(startTopicId),
      this.topicRepository.findLatestVersion(endTopicId),
    ]);

    if (!startTopic) {
      throw new Error(`Start topic with ID ${startTopicId} not found`);
    }

    if (!endTopic) {
      throw new Error(`End topic with ID ${endTopicId} not found`);
    }
  }

  /**
   * Generates cache key for path between two topics
   * @param startId Starting topic ID
   * @param endId Ending topic ID
   * @returns Cache key string
   */
  private getCacheKey(startId: string, endId: string): string {
    // Use lexicographic ordering to ensure consistent cache keys
    return startId < endId ? `${startId}->${endId}` : `${endId}->${startId}`;
  }

  /**
   * Gets cached path result if available and valid
   * @param startId Starting topic ID
   * @param endId Ending topic ID
   * @returns Cached path or null if not found/expired
   */
  private getCachedPath(startId: string, endId: string): string[] | null {
    const cacheKey = this.getCacheKey(startId, endId);
    const entry = this.pathCache.get(cacheKey);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.options.cacheTTL) {
      // Entry expired, remove it
      this.pathCache.delete(cacheKey);
      return null;
    }

    // Update access count for LRU eviction
    entry.accessCount++;
    entry.timestamp = now;

    // Return path in correct direction
    const path = entry.path;
    return startId === path[0] ? path : [...path].reverse();
  }

  /**
   * Caches path result
   * @param startId Starting topic ID
   * @param endId Ending topic ID
   * @param path Path to cache
   */
  private cachePathResult(
    startId: string,
    endId: string,
    path: string[]
  ): void {
    const cacheKey = this.getCacheKey(startId, endId);
    const now = Date.now();

    // Ensure path is stored in lexicographic order
    const orderedPath = startId < endId ? path : [...path].reverse();

    this.pathCache.set(cacheKey, {
      path: orderedPath,
      timestamp: now,
      accessCount: 1,
    });

    // Evict old entries if cache is full
    this.evictOldCacheEntries();
  }

  /**
   * Evicts old cache entries using LRU strategy
   */
  private evictOldCacheEntries(): void {
    if (this.pathCache.size <= this.options.cacheMaxSize) {
      return;
    }

    // Convert to array and sort by access count and timestamp
    const entries = Array.from(this.pathCache.entries()).sort((a, b) => {
      const [, entryA] = a;
      const [, entryB] = b;

      // First sort by access count (ascending)
      if (entryA.accessCount !== entryB.accessCount) {
        return entryA.accessCount - entryB.accessCount;
      }

      // Then by timestamp (ascending - older first)
      return entryA.timestamp - entryB.timestamp;
    });

    // Remove oldest/least accessed entries
    const entriesToRemove = this.pathCache.size - this.options.cacheMaxSize + 1;
    for (let i = 0; i < entriesToRemove; i++) {
      const [key] = entries[i];
      this.pathCache.delete(key);
    }
  }

  /**
   * Converts path IDs to Topic objects
   * @param pathIds Array of topic IDs
   * @returns Promise resolving to array of Topic objects
   */
  private async convertPathToTopics(pathIds: string[]): Promise<Topic[]> {
    const topics = await Promise.all(
      pathIds.map((id) => this.topicRepository.findLatestVersion(id))
    );

    // Filter out any null results (shouldn't happen but safety check)
    return topics.filter((topic): topic is Topic => topic !== null);
  }

  /**
   * Clears all caches
   */
  public clearCache(): void {
    this.pathCache.clear();
    this.graphCache = null;
    this.graphCacheTimestamp = 0;
  }

  /**
   * Gets cache statistics
   * @returns Cache statistics object
   */
  public getCacheStats(): {
    pathCacheSize: number;
    pathCacheMaxSize: number;
    graphCacheValid: boolean;
    pathCacheHitRate?: number;
  } {
    const now = Date.now();
    return {
      pathCacheSize: this.pathCache.size,
      pathCacheMaxSize: this.options.cacheMaxSize,
      graphCacheValid:
        this.graphCache !== null &&
        now - this.graphCacheTimestamp < TopicPathFinder.GRAPH_CACHE_TTL,
    };
  }

  /**
   * Checks if two topics are connected in the hierarchy
   * @param topicId1 First topic ID
   * @param topicId2 Second topic ID
   * @returns Promise resolving to true if topics are connected
   */
  async areTopicsConnected(
    topicId1: string,
    topicId2: string
  ): Promise<boolean> {
    try {
      const path = await this.findShortestPath(topicId1, topicId2);
      return path.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the distance (number of hops) between two topics
   * @param topicId1 First topic ID
   * @param topicId2 Second topic ID
   * @returns Promise resolving to distance or -1 if not connected
   */
  async getTopicDistance(topicId1: string, topicId2: string): Promise<number> {
    try {
      const path = await this.findShortestPath(topicId1, topicId2);
      return path.length > 0 ? path.length - 1 : -1; // -1 for path length to get hops
    } catch (error) {
      return -1;
    }
  }

  /**
   * Finds all topics within a specified distance from a given topic
   * @param topicId The center topic ID
   * @param maxDistance Maximum distance to search
   * @returns Promise resolving to array of topics within the distance
   */
  async findTopicsWithinDistance(
    topicId: string,
    maxDistance: number
  ): Promise<Topic[]> {
    if (maxDistance < 0) {
      throw new Error('Maximum distance must be non-negative');
    }

    const topic = await this.topicRepository.findLatestVersion(topicId);
    if (!topic) {
      throw new Error(`Topic with ID ${topicId} not found`);
    }

    if (maxDistance === 0) {
      return [topic];
    }

    const graph = await this.getOptimizedTopicGraph();
    const visited = new Set<string>();
    const result: string[] = [];

    // BFS with distance tracking
    const queue: Array<{ topicId: string; distance: number }> = [
      { topicId, distance: 0 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.topicId)) {
        continue;
      }

      visited.add(current.topicId);
      result.push(current.topicId);

      // Only continue if we haven't reached max distance
      if (current.distance < maxDistance) {
        const connections = graph.get(current.topicId) || [];
        for (const connectedId of connections) {
          if (!visited.has(connectedId)) {
            queue.push({
              topicId: connectedId,
              distance: current.distance + 1,
            });
          }
        }
      }
    }

    // Convert IDs to Topic objects
    const topics = await Promise.all(
      result.map((id) => this.topicRepository.findLatestVersion(id))
    );

    return topics.filter((topic): topic is Topic => topic !== null);
  }

  /**
   * Validates that the graph is properly connected (no isolated components)
   * @returns Promise resolving to validation result with details
   */
  async validateGraphConnectivity(): Promise<{
    isFullyConnected: boolean;
    componentCount: number;
    isolatedTopics: string[];
  }> {
    const graph = await this.getOptimizedTopicGraph();
    const allTopicIds = Array.from(graph.keys());

    if (allTopicIds.length === 0) {
      return {
        isFullyConnected: true,
        componentCount: 0,
        isolatedTopics: [],
      };
    }

    const visited = new Set<string>();
    let componentCount = 0;
    const isolatedTopics: string[] = [];

    for (const topicId of allTopicIds) {
      if (!visited.has(topicId)) {
        const componentSize = this.exploreComponent(graph, topicId, visited);
        componentCount++;

        // If component has only one node and no connections, it's isolated
        if (componentSize === 1 && (graph.get(topicId)?.length || 0) === 0) {
          isolatedTopics.push(topicId);
        }
      }
    }

    return {
      isFullyConnected: componentCount <= 1,
      componentCount,
      isolatedTopics,
    };
  }

  /**
   * Explores a connected component using DFS
   * @param graph The topic graph
   * @param startId Starting topic ID
   * @param visited Set of visited topic IDs
   * @returns Size of the connected component
   */
  private exploreComponent(
    graph: Map<string, string[]>,
    startId: string,
    visited: Set<string>
  ): number {
    const stack = [startId];
    let componentSize = 0;

    while (stack.length > 0) {
      const currentId = stack.pop()!;

      if (visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);
      componentSize++;

      const connections = graph.get(currentId) || [];
      for (const connectedId of connections) {
        if (!visited.has(connectedId)) {
          stack.push(connectedId);
        }
      }
    }

    return componentSize;
  }
}
