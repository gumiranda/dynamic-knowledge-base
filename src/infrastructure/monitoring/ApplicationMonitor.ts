import { Logger } from '../middleware/LoggingMiddleware';

export interface Metric {
  name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  timestamp: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export class ApplicationMonitor {
  private static metrics: Map<string, Metric[]> = new Map();
  private static healthChecks: Map<string, HealthCheck> = new Map();
  private static startTime = Date.now();

  /**
   * Record a metric value
   */
  static recordMetric(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    const metric: Metric = {
      name,
      value,
      timestamp: new Date().toISOString(),
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricHistory = this.metrics.get(name)!;
    metricHistory.push(metric);

    // Keep only last 100 metrics per type
    if (metricHistory.length > 100) {
      metricHistory.shift();
    }

    Logger.debug(`Metric recorded: ${name} = ${value}`, {
      metadata: { metric, tags },
    });
  }

  /**
   * Increment a counter metric
   */
  static incrementCounter(name: string, tags?: Record<string, string>): void {
    const current = this.getLatestMetric(name)?.value || 0;
    this.recordMetric(name, current + 1, tags);
  }

  /**
   * Record timing metric
   */
  static recordTiming(
    name: string,
    startTime: number,
    tags?: Record<string, string>
  ): void {
    const duration = Date.now() - startTime;
    this.recordMetric(name, duration, tags);
  }

  /**
   * Get latest metric value
   */
  static getLatestMetric(name: string): Metric | undefined {
    const metrics = this.metrics.get(name);
    return metrics && metrics.length > 0
      ? metrics[metrics.length - 1]
      : undefined;
  }

  /**
   * Get metric history
   */
  static getMetricHistory(name: string, limit?: number): Metric[] {
    const metrics = this.metrics.get(name) || [];
    return limit ? metrics.slice(-limit) : metrics;
  }

  /**
   * Get all metrics
   */
  static getAllMetrics(): Record<string, Metric[]> {
    const result: Record<string, Metric[]> = {};
    for (const [name, metrics] of this.metrics.entries()) {
      result[name] = metrics;
    }
    return result;
  }

  /**
   * Register a health check
   */
  static registerHealthCheck(
    name: string,
    checkFunction: () => Promise<Omit<HealthCheck, 'name' | 'timestamp'>>
  ): void {
    this.runHealthCheck(name, checkFunction);

    // Run health check periodically (every 30 seconds)
    setInterval(() => {
      this.runHealthCheck(name, checkFunction);
    }, 30000);
  }

  /**
   * Run a health check
   */
  private static async runHealthCheck(
    name: string,
    checkFunction: () => Promise<Omit<HealthCheck, 'name' | 'timestamp'>>
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await checkFunction();
      const healthCheck: HealthCheck = {
        name,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        ...result,
      };

      this.healthChecks.set(name, healthCheck);

      if (healthCheck.status !== 'healthy') {
        Logger.warn(`Health check failed: ${name}`, {
          metadata: { healthCheck },
        });
      } else {
        Logger.debug(`Health check passed: ${name}`, {
          metadata: { healthCheck },
        });
      }
    } catch (error) {
      const healthCheck: HealthCheck = {
        name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      };

      this.healthChecks.set(name, healthCheck);
      Logger.error(`Health check error: ${name}`, error as Error, {
        metadata: { healthCheck },
      });
    }
  }

  /**
   * Get all health checks
   */
  static getHealthChecks(): Record<string, HealthCheck> {
    const result: Record<string, HealthCheck> = {};
    for (const [name, check] of this.healthChecks.entries()) {
      result[name] = check;
    }
    return result;
  }

  /**
   * Get overall application health
   */
  static getOverallHealth(): {
    status: 'healthy' | 'unhealthy' | 'degraded';
    checks: Record<string, HealthCheck>;
    uptime: number;
    timestamp: string;
  } {
    const checks = this.getHealthChecks();
    const checkValues = Object.values(checks);

    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    if (checkValues.some((check) => check.status === 'unhealthy')) {
      status = 'unhealthy';
    } else if (checkValues.some((check) => check.status === 'degraded')) {
      status = 'degraded';
    }

    return {
      status,
      checks,
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get system metrics
   */
  static getSystemMetrics(): {
    memory: NodeJS.MemoryUsage;
    uptime: number;
    timestamp: string;
  } {
    return {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Start monitoring system metrics
   */
  static startSystemMonitoring(): void {
    // Record system metrics every minute
    setInterval(() => {
      const memUsage = process.memoryUsage();

      this.recordMetric('system.memory.rss', memUsage.rss);
      this.recordMetric('system.memory.heapUsed', memUsage.heapUsed);
      this.recordMetric('system.memory.heapTotal', memUsage.heapTotal);
      this.recordMetric('system.uptime', process.uptime());

      // Log memory warnings
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      if (heapUsedMB > 100) {
        Logger.warn('High memory usage detected', {
          metadata: {
            heapUsedMB: Math.round(heapUsedMB),
            threshold: '100MB',
          },
        });
      }
    }, 60000);

    Logger.info('System monitoring started');
  }

  /**
   * Create timing decorator for methods
   */
  static timing(metricName: string) {
    return function (
      _target: any,
      propertyName: string,
      descriptor: PropertyDescriptor
    ) {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const startTime = Date.now();
        try {
          const result = await method.apply(this, args);
          ApplicationMonitor.recordTiming(metricName, startTime, {
            method: propertyName,
            status: 'success',
          });
          return result;
        } catch (error) {
          ApplicationMonitor.recordTiming(metricName, startTime, {
            method: propertyName,
            status: 'error',
          });
          throw error;
        }
      };
    };
  }

  /**
   * Create counter decorator for methods
   */
  static counter(metricName: string) {
    return function (
      _target: any,
      propertyName: string,
      descriptor: PropertyDescriptor
    ) {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        try {
          const result = await method.apply(this, args);
          ApplicationMonitor.incrementCounter(metricName, {
            method: propertyName,
            status: 'success',
          });
          return result;
        } catch (error) {
          ApplicationMonitor.incrementCounter(metricName, {
            method: propertyName,
            status: 'error',
          });
          throw error;
        }
      };
    };
  }
}
