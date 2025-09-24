import { ErrorTracker } from '../ErrorTracker';

describe('ErrorTracker', () => {
  beforeEach(() => {
    // Clear errors before each test
    (ErrorTracker as any).errors.clear();
  });

  describe('Error Tracking', () => {
    it('should track new errors', () => {
      const error = new Error('Test error');
      const context = {
        method: 'POST',
        url: '/test',
        userId: 'user123',
      };

      const errorId = ErrorTracker.trackError(error, context);

      expect(errorId).toBeDefined();

      const errorReport = ErrorTracker.getError(errorId);
      expect(errorReport).toMatchObject({
        id: errorId,
        error: {
          name: 'Error',
          message: 'Test error',
          stack: expect.any(String),
        },
        context,
        count: 1,
        firstOccurrence: expect.any(String),
        lastOccurrence: expect.any(String),
      });
    });

    it('should group similar errors', () => {
      const error1 = new Error('Same error');
      const error2 = new Error('Same error');
      const context = { method: 'GET', url: '/test' };

      const errorId1 = ErrorTracker.trackError(error1, context);
      const errorId2 = ErrorTracker.trackError(error2, context);

      expect(errorId1).toBe(errorId2);

      const errorReport = ErrorTracker.getError(errorId1);
      expect(errorReport?.count).toBe(2);
    });

    it('should differentiate errors by context', () => {
      const error1 = new Error('Same error');
      const error2 = new Error('Same error');

      const errorId1 = ErrorTracker.trackError(error1, { method: 'GET' });
      const errorId2 = ErrorTracker.trackError(error2, { method: 'POST' });

      expect(errorId1).not.toBe(errorId2);
    });

    it('should include metadata in error reports', () => {
      const error = new Error('Test error');
      const metadata = { customField: 'value', requestData: { id: 123 } };

      const errorId = ErrorTracker.trackError(error, {}, metadata);

      const errorReport = ErrorTracker.getError(errorId);
      expect(errorReport?.metadata).toEqual(metadata);
    });

    it('should merge metadata for repeated errors', () => {
      const error1 = new Error('Same error');
      const error2 = new Error('Same error');
      const context = { method: 'GET' };

      ErrorTracker.trackError(error1, context, { field1: 'value1' });
      const errorId = ErrorTracker.trackError(error2, context, {
        field2: 'value2',
      });

      const errorReport = ErrorTracker.getError(errorId);
      expect(errorReport?.metadata).toEqual({
        field1: 'value1',
        field2: 'value2',
      });
    });
  });

  describe('Error Retrieval', () => {
    it('should get all errors sorted by last occurrence', () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');

      ErrorTracker.trackError(error1);

      // Simulate time passing
      jest.useFakeTimers();
      jest.advanceTimersByTime(1000);

      ErrorTracker.trackError(error2);

      const allErrors = ErrorTracker.getAllErrors();
      expect(allErrors).toHaveLength(2);
      expect(allErrors[0].error.message).toBe('Second error');
      expect(allErrors[1].error.message).toBe('First error');

      jest.useRealTimers();
    });

    it('should get error statistics', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      const error3 = new Error('Error 1'); // Same as first

      ErrorTracker.trackError(error1);
      ErrorTracker.trackError(error2);
      ErrorTracker.trackError(error3);

      const stats = ErrorTracker.getErrorStats();
      expect(stats).toMatchObject({
        totalErrors: 3,
        uniqueErrors: 2,
        recentErrors: expect.any(Number),
        topErrors: expect.arrayContaining([
          expect.objectContaining({
            count: 2,
            message: 'Error 1',
          }),
        ]),
      });
    });

    it('should limit error storage', () => {
      const maxErrors = (ErrorTracker as any).maxErrors;

      // Track more errors than the limit
      for (let i = 0; i < maxErrors + 10; i++) {
        ErrorTracker.trackError(new Error(`Error ${i}`));
      }

      const allErrors = ErrorTracker.getAllErrors();
      expect(allErrors.length).toBe(maxErrors);
    });
  });

  describe('Error Cleanup', () => {
    it('should clear old errors', () => {
      jest.useFakeTimers();

      const oldError = new Error('Old error');
      const recentError = new Error('Recent error');

      ErrorTracker.trackError(oldError);

      // Advance time by 8 days
      jest.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

      ErrorTracker.trackError(recentError);

      const removedCount = ErrorTracker.clearOldErrors(7);

      expect(removedCount).toBe(1);

      const allErrors = ErrorTracker.getAllErrors();
      expect(allErrors).toHaveLength(1);
      expect(allErrors[0].error.message).toBe('Recent error');

      jest.useRealTimers();
    });
  });

  describe('Error Trends', () => {
    it('should get error trends for the last 24 hours', () => {
      jest.useFakeTimers();

      // Track errors at different times
      ErrorTracker.trackError(new Error('Error 1'));

      jest.advanceTimersByTime(2 * 60 * 60 * 1000); // 2 hours
      ErrorTracker.trackError(new Error('Error 2'));
      ErrorTracker.trackError(new Error('Error 3'));

      const trends = ErrorTracker.getErrorTrends();

      expect(trends).toHaveLength(24);
      expect(
        trends.every((trend) => trend.hour && typeof trend.count === 'number')
      ).toBe(true);

      // Should have some non-zero counts
      const totalCount = trends.reduce((sum, trend) => sum + trend.count, 0);
      expect(totalCount).toBeGreaterThan(0);

      jest.useRealTimers();
    });
  });

  describe('Error Tracking Decorator', () => {
    it('should track errors in decorated methods', async () => {
      class TestService {
        @ErrorTracker.track({ method: 'TestService.errorMethod' })
        async errorMethod(): Promise<void> {
          throw new Error('Method error');
        }

        @ErrorTracker.track()
        async successMethod(): Promise<string> {
          return 'success';
        }
      }

      const service = new TestService();

      // Test error tracking
      await expect(service.errorMethod()).rejects.toThrow('Method error');

      const allErrors = ErrorTracker.getAllErrors();
      expect(allErrors).toHaveLength(1);
      expect(allErrors[0].error.message).toBe('Method error');
      expect(allErrors[0].context.method).toBe('TestService.errorMethod');

      // Test successful method (should not track errors)
      const result = await service.successMethod();
      expect(result).toBe('success');
      expect(ErrorTracker.getAllErrors()).toHaveLength(1); // Still only one error
    });
  });
});
