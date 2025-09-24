import { Logger } from '../middleware/LoggingMiddleware';
import { ApplicationMonitor } from './ApplicationMonitor';

export interface ErrorReport {
  id: string;
  timestamp: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    method?: string;
    url?: string;
    userId?: string;
    requestId?: string;
    userAgent?: string;
    ip?: string;
  };
  metadata?: Record<string, any>;
  count: number;
  firstOccurrence: string;
  lastOccurrence: string;
}

export class ErrorTracker {
  private static errors: Map<string, ErrorReport> = new Map();
  private static maxErrors = 1000;

  /**
   * Generate error fingerprint for grouping similar errors
   */
  private static generateFingerprint(
    error: Error,
    context?: Partial<ErrorReport['context']>
  ): string {
    const key = `${error.name}:${error.message}:${context?.method || ''}:${context?.url || ''}`;

    // Use a simple hash function for consistent fingerprints
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36).substring(0, 8);
  }

  /**
   * Track an error occurrence
   */
  static trackError(
    error: Error,
    context?: Partial<ErrorReport['context']>,
    metadata?: Record<string, any>
  ): string {
    const fingerprint = this.generateFingerprint(error, context);
    const timestamp = new Date().toISOString();

    // Increment error counter metric
    ApplicationMonitor.incrementCounter('errors.total', {
      errorType: error.name,
      method: context?.method || 'unknown',
    });

    if (this.errors.has(fingerprint)) {
      // Update existing error report
      const existingReport = this.errors.get(fingerprint)!;
      existingReport.count++;
      existingReport.lastOccurrence = timestamp;
      existingReport.metadata = { ...existingReport.metadata, ...metadata };
    } else {
      // Create new error report
      const errorReport: ErrorReport = {
        id: fingerprint,
        timestamp,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        context: context || {},
        metadata,
        count: 1,
        firstOccurrence: timestamp,
        lastOccurrence: timestamp,
      };

      this.errors.set(fingerprint, errorReport);

      // Remove oldest errors if we exceed the limit
      if (this.errors.size > this.maxErrors) {
        const oldestKey = this.errors.keys().next().value;
        if (oldestKey) {
          this.errors.delete(oldestKey);
        }
      }
    }

    // Log the error
    Logger.error(`Error tracked: ${error.name}`, error, {
      requestId: context?.requestId,
      method: context?.method,
      url: context?.url,
      metadata: {
        errorId: fingerprint,
        count: this.errors.get(fingerprint)?.count,
        ...metadata,
      },
    });

    return fingerprint;
  }

  /**
   * Get error report by ID
   */
  static getError(errorId: string): ErrorReport | undefined {
    return this.errors.get(errorId);
  }

  /**
   * Get all error reports
   */
  static getAllErrors(): ErrorReport[] {
    return Array.from(this.errors.values()).sort(
      (a, b) =>
        new Date(b.lastOccurrence).getTime() -
        new Date(a.lastOccurrence).getTime()
    );
  }

  /**
   * Get error statistics
   */
  static getErrorStats(): {
    totalErrors: number;
    uniqueErrors: number;
    recentErrors: number;
    topErrors: Array<{ id: string; count: number; message: string }>;
  } {
    const errors = this.getAllErrors();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const recentErrors = errors.filter(
      (error) => error.lastOccurrence > oneHourAgo
    );
    const totalErrorCount = errors.reduce((sum, error) => sum + error.count, 0);

    const topErrors = errors
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((error) => ({
        id: error.id,
        count: error.count,
        message: error.error.message,
      }));

    return {
      totalErrors: totalErrorCount,
      uniqueErrors: errors.length,
      recentErrors: recentErrors.length,
      topErrors,
    };
  }

  /**
   * Clear old errors (older than specified days)
   */
  static clearOldErrors(daysOld: number = 7): number {
    const cutoffDate = new Date(
      Date.now() - daysOld * 24 * 60 * 60 * 1000
    ).toISOString();
    let removedCount = 0;

    for (const [id, error] of this.errors.entries()) {
      if (error.lastOccurrence < cutoffDate) {
        this.errors.delete(id);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      Logger.info(`Cleared ${removedCount} old error reports`, {
        metadata: { daysOld, cutoffDate },
      });
    }

    return removedCount;
  }

  /**
   * Get error trends (hourly counts for the last 24 hours)
   */
  static getErrorTrends(): Array<{ hour: string; count: number }> {
    const trends: Array<{ hour: string; count: number }> = [];
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      const hourStartISO = hourStart.toISOString();
      const hourEndISO = hourEnd.toISOString();

      const errorCount = Array.from(this.errors.values())
        .filter(
          (error) =>
            error.lastOccurrence >= hourStartISO &&
            error.lastOccurrence < hourEndISO
        )
        .reduce((sum, error) => sum + error.count, 0);

      trends.push({
        hour: hourStart.toISOString().substring(0, 13) + ':00:00Z',
        count: errorCount,
      });
    }

    return trends;
  }

  /**
   * Start automatic error cleanup
   */
  static startCleanup(): void {
    // Clean up old errors every 6 hours
    setInterval(
      () => {
        this.clearOldErrors(7);
      },
      6 * 60 * 60 * 1000
    );

    Logger.info('Error cleanup started');
  }

  /**
   * Create error tracking decorator for methods
   */
  static track(context?: Partial<ErrorReport['context']>) {
    return function (
      target: any,
      propertyName: string,
      descriptor: PropertyDescriptor
    ) {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        try {
          return await method.apply(this, args);
        } catch (error) {
          if (error instanceof Error) {
            ErrorTracker.trackError(error, {
              ...context,
              method: `${target.constructor.name}.${propertyName}`,
            });
          }
          throw error;
        }
      };
    };
  }
}
