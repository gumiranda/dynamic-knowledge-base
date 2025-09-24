import { ApplicationMonitor } from '../ApplicationMonitor';

describe('ApplicationMonitor', () => {
  beforeEach(() => {
    // Clear metrics before each test
    (ApplicationMonitor as any).metrics.clear();
    (ApplicationMonitor as any).healthChecks.clear();
  });

  describe('Metrics', () => {
    it('should record metrics', () => {
      ApplicationMonitor.recordMetric('test.counter', 5, { service: 'test' });

      const metric = ApplicationMonitor.getLatestMetric('test.counter');
      expect(metric).toMatchObject({
        name: 'test.counter',
        value: 5,
        tags: { service: 'test' },
        timestamp: expect.any(String),
      });
    });

    it('should increment counters', () => {
      ApplicationMonitor.incrementCounter('requests.total');
      ApplicationMonitor.incrementCounter('requests.total');

      const metric = ApplicationMonitor.getLatestMetric('requests.total');
      expect(metric?.value).toBe(2);
    });

    it('should record timing metrics', () => {
      const startTime = Date.now() - 100;
      ApplicationMonitor.recordTiming('request.duration', startTime);

      const metric = ApplicationMonitor.getLatestMetric('request.duration');
      expect(metric?.value).toBeGreaterThan(90);
      expect(metric?.value).toBeLessThan(200);
    });

    it('should maintain metric history with limit', () => {
      // Record more than 100 metrics
      for (let i = 0; i < 150; i++) {
        ApplicationMonitor.recordMetric('test.metric', i);
      }

      const history = ApplicationMonitor.getMetricHistory('test.metric');
      expect(history.length).toBe(100);
      expect(history[0].value).toBe(50); // First 50 should be removed
      expect(history[99].value).toBe(149);
    });

    it('should get all metrics', () => {
      ApplicationMonitor.recordMetric('metric1', 1);
      ApplicationMonitor.recordMetric('metric2', 2);

      const allMetrics = ApplicationMonitor.getAllMetrics();
      expect(Object.keys(allMetrics)).toEqual(['metric1', 'metric2']);
    });
  });

  describe('Health Checks', () => {
    it('should register and run health checks', async () => {
      const healthCheckFn = jest.fn().mockResolvedValue({
        status: 'healthy' as const,
        message: 'All good',
      });

      ApplicationMonitor.registerHealthCheck('test.service', healthCheckFn);

      // Wait for health check to run
      await new Promise((resolve) => setTimeout(resolve, 10));

      const healthChecks = ApplicationMonitor.getHealthChecks();
      expect(healthChecks['test.service']).toMatchObject({
        name: 'test.service',
        status: 'healthy',
        message: 'All good',
        timestamp: expect.any(String),
        duration: expect.any(Number),
      });
    });

    it('should handle health check failures', async () => {
      const healthCheckFn = jest
        .fn()
        .mockRejectedValue(new Error('Service down'));

      ApplicationMonitor.registerHealthCheck('failing.service', healthCheckFn);

      // Wait for health check to run
      await new Promise((resolve) => setTimeout(resolve, 10));

      const healthChecks = ApplicationMonitor.getHealthChecks();
      expect(healthChecks['failing.service']).toMatchObject({
        name: 'failing.service',
        status: 'unhealthy',
        message: 'Service down',
      });
    });

    it('should calculate overall health status', async () => {
      const healthyCheck = jest
        .fn()
        .mockResolvedValue({ status: 'healthy' as const });
      const degradedCheck = jest
        .fn()
        .mockResolvedValue({ status: 'degraded' as const });

      ApplicationMonitor.registerHealthCheck('healthy.service', healthyCheck);
      ApplicationMonitor.registerHealthCheck('degraded.service', degradedCheck);

      // Wait for health checks to run
      await new Promise((resolve) => setTimeout(resolve, 10));

      const overallHealth = ApplicationMonitor.getOverallHealth();
      expect(overallHealth.status).toBe('degraded');
      expect(overallHealth.uptime).toBeGreaterThan(0);
    });
  });

  describe('System Metrics', () => {
    it('should get system metrics', () => {
      const systemMetrics = ApplicationMonitor.getSystemMetrics();

      expect(systemMetrics).toMatchObject({
        memory: expect.objectContaining({
          rss: expect.any(Number),
          heapUsed: expect.any(Number),
          heapTotal: expect.any(Number),
        }),
        uptime: expect.any(Number),
        timestamp: expect.any(String),
      });
    });
  });

  describe('Decorators', () => {
    it('should create timing decorator', async () => {
      class TestService {
        @ApplicationMonitor.timing('test.method.duration')
        async testMethod(): Promise<string> {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 'success';
        }
      }

      const service = new TestService();
      const result = await service.testMethod();

      expect(result).toBe('success');

      const metric = ApplicationMonitor.getLatestMetric('test.method.duration');
      expect(metric?.value).toBeGreaterThan(5);
    });

    it('should create counter decorator', async () => {
      class TestService {
        @ApplicationMonitor.counter('test.method.calls')
        async testMethod(): Promise<string> {
          return 'success';
        }
      }

      const service = new TestService();
      await service.testMethod();
      await service.testMethod();

      const metric = ApplicationMonitor.getLatestMetric('test.method.calls');
      expect(metric?.value).toBe(2);
    });

    it('should handle errors in decorated methods', async () => {
      class TestService {
        @ApplicationMonitor.timing('test.error.duration')
        @ApplicationMonitor.counter('test.error.calls')
        async errorMethod(): Promise<void> {
          throw new Error('Test error');
        }
      }

      const service = new TestService();

      await expect(service.errorMethod()).rejects.toThrow('Test error');

      const timingMetric = ApplicationMonitor.getLatestMetric(
        'test.error.duration'
      );
      const counterMetric =
        ApplicationMonitor.getLatestMetric('test.error.calls');

      expect(timingMetric?.tags?.status).toBe('error');
      expect(counterMetric?.tags?.status).toBe('error');
    });
  });
});
