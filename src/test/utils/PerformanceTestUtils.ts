/**
 * Utilities for performance testing and benchmarking
 */
export class PerformanceTestUtils {
  /**
   * Measures execution time of a function
   */
  static async measureExecutionTime<T>(
    fn: () => Promise<T> | T,
    iterations: number = 1
  ): Promise<{
    result: T;
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
    times: number[];
  }> {
    const times: number[] = [];
    let result: T;

    for (let i = 0; i < iterations; i++) {
      const startTime = process.hrtime.bigint();
      result = await fn();
      const endTime = process.hrtime.bigint();

      const executionTime = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
      times.push(executionTime);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      result: result!,
      averageTime,
      minTime,
      maxTime,
      totalTime,
      times,
    };
  }

  /**
   * Measures memory usage during function execution
   */
  static async measureMemoryUsage<T>(fn: () => Promise<T> | T): Promise<{
    result: T;
    memoryUsage: {
      before: NodeJS.MemoryUsage;
      after: NodeJS.MemoryUsage;
      peak: NodeJS.MemoryUsage;
      delta: {
        rss: number;
        heapUsed: number;
        heapTotal: number;
        external: number;
      };
    };
  }> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const memoryBefore = process.memoryUsage();
    let peakMemory = { ...memoryBefore };

    // Monitor memory during execution
    const memoryMonitor = setInterval(() => {
      const current = process.memoryUsage();
      if (current.heapUsed > peakMemory.heapUsed) {
        peakMemory = { ...current };
      }
    }, 10);

    try {
      const result = await fn();

      clearInterval(memoryMonitor);
      const memoryAfter = process.memoryUsage();

      const delta = {
        rss: memoryAfter.rss - memoryBefore.rss,
        heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
        heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
        external: memoryAfter.external - memoryBefore.external,
      };

      return {
        result,
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          peak: peakMemory,
          delta,
        },
      };
    } finally {
      clearInterval(memoryMonitor);
    }
  }

  /**
   * Runs a performance benchmark with multiple scenarios
   */
  static async runBenchmark<T>(
    scenarios: Array<{
      name: string;
      fn: () => Promise<T> | T;
      iterations?: number;
    }>,
    options: {
      warmupIterations?: number;
      measureMemory?: boolean;
    } = {}
  ): Promise<
    Array<{
      name: string;
      performance: {
        averageTime: number;
        minTime: number;
        maxTime: number;
        totalTime: number;
        iterations: number;
      };
      memory?: {
        delta: {
          rss: number;
          heapUsed: number;
          heapTotal: number;
          external: number;
        };
        peak: NodeJS.MemoryUsage;
      };
    }>
  > {
    const results = [];

    for (const scenario of scenarios) {
      const iterations = scenario.iterations || 10;
      const warmupIterations = options.warmupIterations || 3;

      // Warmup runs
      for (let i = 0; i < warmupIterations; i++) {
        await scenario.fn();
      }

      // Actual benchmark
      let performanceResult;
      let memoryResult;

      if (options.measureMemory) {
        const combined = await this.measureMemoryUsage(async () => {
          return await this.measureExecutionTime(scenario.fn, iterations);
        });
        performanceResult = combined.result;
        memoryResult = combined.memoryUsage;
      } else {
        performanceResult = await this.measureExecutionTime(
          scenario.fn,
          iterations
        );
      }

      results.push({
        name: scenario.name,
        performance: {
          averageTime: performanceResult.averageTime,
          minTime: performanceResult.minTime,
          maxTime: performanceResult.maxTime,
          totalTime: performanceResult.totalTime,
          iterations,
        },
        memory: memoryResult
          ? {
              delta: memoryResult.delta,
              peak: memoryResult.peak,
            }
          : undefined,
      });
    }

    return results;
  }

  /**
   * Tests algorithm efficiency with different input sizes
   */
  static async testAlgorithmEfficiency<T>(
    algorithm: (inputSize: number) => Promise<T> | T,
    inputSizes: number[],
    options: {
      iterations?: number;
      timeoutMs?: number;
    } = {}
  ): Promise<
    Array<{
      inputSize: number;
      averageTime: number;
      timeComplexity: string;
      successful: boolean;
      error?: string;
    }>
  > {
    const results: Array<{
      inputSize: number;
      averageTime: number;
      timeComplexity: string;
      successful: boolean;
      error?: string;
    }> = [];
    const iterations = options.iterations || 5;
    const timeoutMs = options.timeoutMs || 30000;

    for (const inputSize of inputSizes) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), timeoutMs);
        });

        const benchmarkPromise = this.measureExecutionTime(
          () => algorithm(inputSize),
          iterations
        );

        const result = await Promise.race([benchmarkPromise, timeoutPromise]);

        results.push({
          inputSize,
          averageTime: result.averageTime,
          timeComplexity: this.estimateTimeComplexity(results),
          successful: true,
        });
      } catch (error) {
        results.push({
          inputSize,
          averageTime: 0,
          timeComplexity: 'Unknown',
          successful: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Estimates time complexity based on performance results
   */
  private static estimateTimeComplexity(
    results: Array<{ inputSize: number; averageTime: number }>
  ): string {
    if (results.length < 2) return 'Unknown';

    const last = results[results.length - 1];
    const secondLast = results[results.length - 2];

    const sizeRatio = last.inputSize / secondLast.inputSize;
    const timeRatio = last.averageTime / secondLast.averageTime;

    if (timeRatio < 1.2) return 'O(1)';
    if (timeRatio < sizeRatio * 1.2) return 'O(n)';
    if (timeRatio < Math.log2(sizeRatio) * 1.5) return 'O(log n)';
    if (timeRatio < sizeRatio * sizeRatio * 1.2) return 'O(n²)';
    if (timeRatio < Math.pow(sizeRatio, 3) * 1.2) return 'O(n³)';

    return 'O(n^k) or worse';
  }

  /**
   * Creates a load test for concurrent operations
   */
  static async runLoadTest<T>(
    operation: () => Promise<T>,
    options: {
      concurrentUsers: number;
      operationsPerUser: number;
      rampUpTimeMs?: number;
    }
  ): Promise<{
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    operationsPerSecond: number;
    errors: Array<{ error: string; count: number }>;
  }> {
    const { concurrentUsers, operationsPerUser, rampUpTimeMs = 0 } = options;
    const totalOperations = concurrentUsers * operationsPerUser;

    const results: Array<{ success: boolean; time: number; error?: string }> =
      [];
    const userPromises: Promise<void>[] = [];

    const startTime = Date.now();

    // Create concurrent users
    for (let user = 0; user < concurrentUsers; user++) {
      const userPromise = (async () => {
        // Ramp up delay
        if (rampUpTimeMs > 0) {
          const delay = (user / concurrentUsers) * rampUpTimeMs;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // Execute operations for this user
        for (let op = 0; op < operationsPerUser; op++) {
          const opStartTime = Date.now();
          try {
            await operation();
            const opEndTime = Date.now();
            results.push({
              success: true,
              time: opEndTime - opStartTime,
            });
          } catch (error) {
            const opEndTime = Date.now();
            results.push({
              success: false,
              time: opEndTime - opStartTime,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      })();

      userPromises.push(userPromise);
    }

    // Wait for all users to complete
    await Promise.all(userPromises);

    const endTime = Date.now();
    const totalTimeMs = endTime - startTime;

    // Analyze results
    const successfulOperations = results.filter((r) => r.success).length;
    const failedOperations = results.filter((r) => !r.success).length;
    const responseTimes = results.map((r) => r.time);

    const averageResponseTime =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    const operationsPerSecond = (totalOperations / totalTimeMs) * 1000;

    // Count errors
    const errorCounts = new Map<string, number>();
    results.forEach((result) => {
      if (!result.success && result.error) {
        errorCounts.set(result.error, (errorCounts.get(result.error) || 0) + 1);
      }
    });

    const errors = Array.from(errorCounts.entries()).map(([error, count]) => ({
      error,
      count,
    }));

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      operationsPerSecond,
      errors,
    };
  }

  /**
   * Formats performance results for display
   */
  static formatPerformanceResults(
    results: Array<{
      name: string;
      performance: {
        averageTime: number;
        minTime: number;
        maxTime: number;
        iterations: number;
      };
      memory?: {
        delta: { heapUsed: number };
      };
    }>
  ): string {
    let output = '\n=== Performance Test Results ===\n';

    results.forEach((result) => {
      output += `\n${result.name}:\n`;
      output += `  Average Time: ${result.performance.averageTime.toFixed(2)}ms\n`;
      output += `  Min Time: ${result.performance.minTime.toFixed(2)}ms\n`;
      output += `  Max Time: ${result.performance.maxTime.toFixed(2)}ms\n`;
      output += `  Iterations: ${result.performance.iterations}\n`;

      if (result.memory) {
        const heapMB = result.memory.delta.heapUsed / (1024 * 1024);
        output += `  Memory Delta: ${heapMB.toFixed(2)}MB\n`;
      }
    });

    return output;
  }

  /**
   * Asserts performance meets requirements
   */
  static assertPerformance(
    actualTime: number,
    maxAllowedTime: number,
    operation: string
  ): void {
    if (actualTime > maxAllowedTime) {
      throw new Error(
        `Performance assertion failed for ${operation}: ` +
          `Expected <= ${maxAllowedTime}ms, but got ${actualTime.toFixed(2)}ms`
      );
    }
  }

  /**
   * Asserts memory usage meets requirements
   */
  static assertMemoryUsage(
    actualMemoryMB: number,
    maxAllowedMemoryMB: number,
    operation: string
  ): void {
    if (actualMemoryMB > maxAllowedMemoryMB) {
      throw new Error(
        `Memory assertion failed for ${operation}: ` +
          `Expected <= ${maxAllowedMemoryMB}MB, but got ${actualMemoryMB.toFixed(2)}MB`
      );
    }
  }
}
