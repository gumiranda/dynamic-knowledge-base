import { Request, Response, NextFunction } from 'express';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
  requestId?: string;
  body?: any;
  params?: any;
  query?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

export class Logger {
  private static requestCounter = 0;

  /**
   * Generate unique request ID
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestCounter}`;
  }

  /**
   * Get client IP address
   */
  static getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Create structured log entry
   */
  static createLogEntry(
    level: LogEntry['level'],
    message: string,
    metadata?: Partial<LogEntry>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
    };
  }

  /**
   * Log structured entry to console
   */
  static log(entry: LogEntry): void {
    const logLevel = entry.level.toUpperCase();
    const emoji = this.getLogEmoji(entry.level);

    if (process.env.NODE_ENV === 'development') {
      // Pretty print for development
      console.log(`${emoji} [${logLevel}] ${entry.message}`);
      if (entry.method && entry.url) {
        console.log(`   ${entry.method} ${entry.url}`);
      }
      if (entry.statusCode && entry.duration) {
        console.log(
          `   Status: ${entry.statusCode} | Duration: ${entry.duration}ms`
        );
      }
      if (entry.error) {
        console.log(`   Error: ${entry.error.name} - ${entry.error.message}`);
      }
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        console.log(`   Metadata:`, entry.metadata);
      }
    } else {
      // JSON format for production
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Get emoji for log level
   */
  private static getLogEmoji(level: LogEntry['level']): string {
    switch (level) {
      case 'info':
        return '📝';
      case 'warn':
        return '⚠️';
      case 'error':
        return '❌';
      case 'debug':
        return '🔍';
      default:
        return '📋';
    }
  }

  /**
   * Log info message
   */
  static info(message: string, metadata?: Partial<LogEntry>): void {
    this.log(this.createLogEntry('info', message, metadata));
  }

  /**
   * Log warning message
   */
  static warn(message: string, metadata?: Partial<LogEntry>): void {
    this.log(this.createLogEntry('warn', message, metadata));
  }

  /**
   * Log error message
   */
  static error(
    message: string,
    error?: Error,
    metadata?: Partial<LogEntry>
  ): void {
    const errorMetadata = error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }
      : {};

    this.log(
      this.createLogEntry('error', message, {
        ...errorMetadata,
        ...metadata,
      })
    );
  }

  /**
   * Log debug message (only in development)
   */
  static debug(message: string, metadata?: Partial<LogEntry>): void {
    if (process.env.NODE_ENV === 'development') {
      this.log(this.createLogEntry('debug', message, metadata));
    }
  }
}

export class LoggingMiddleware {
  /**
   * Enhanced request/response logging middleware
   */
  static log(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const requestId = Logger.generateRequestId();
    const clientIp = Logger.getClientIp(req);

    // Add request ID to request object for use in other middleware
    (req as any).requestId = requestId;

    // Log incoming request
    Logger.info('Incoming request', {
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.get('User-Agent'),
      ip: clientIp,
      requestId,
      params: Object.keys(req.params).length > 0 ? req.params : undefined,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      body:
        req.method !== 'GET' && req.body
          ? LoggingMiddleware.sanitizeBody(req.body)
          : undefined,
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any): Response {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Log response
      const logLevel =
        statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
      const message = `Request completed`;

      Logger.log(
        Logger.createLogEntry(logLevel, message, {
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode,
          duration,
          ip: clientIp,
          requestId,
          metadata: {
            responseSize: chunk ? Buffer.byteLength(chunk) : 0,
          },
        })
      );

      // Call original end method
      originalEnd.call(this, chunk, encoding);
      return this;
    };

    next();
  }

  /**
   * Sanitize request body for logging (remove sensitive data)
   */
  private static sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Performance monitoring middleware
   */
  static performance(req: Request, res: Response, next: NextFunction): void {
    const startTime = process.hrtime.bigint();

    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      // Log slow requests (> 1000ms)
      if (duration > 1000) {
        Logger.warn('Slow request detected', {
          method: req.method,
          url: req.originalUrl || req.url,
          duration,
          requestId: (req as any).requestId,
          metadata: {
            threshold: '1000ms',
          },
        });
      }

      // Log memory usage for long requests
      if (duration > 5000) {
        const memUsage = process.memoryUsage();
        Logger.warn('Long request with memory usage', {
          method: req.method,
          url: req.originalUrl || req.url,
          duration,
          requestId: (req as any).requestId,
          metadata: {
            memoryUsage: {
              rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
              heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
              heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            },
          },
        });
      }
    });

    next();
  }

  /**
   * Security logging middleware
   */
  static security(req: Request, _res: Response, next: NextFunction): void {
    const suspiciousPatterns = [
      /script/i,
      /javascript/i,
      /vbscript/i,
      /onload/i,
      /onerror/i,
      /eval\(/i,
      /union.*select/i,
      /drop.*table/i,
    ];

    const requestData = JSON.stringify({
      url: req.url,
      body: req.body,
      query: req.query,
      params: req.params,
    });

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestData)) {
        Logger.warn('Suspicious request detected', {
          method: req.method,
          url: req.originalUrl || req.url,
          ip: Logger.getClientIp(req),
          userAgent: req.get('User-Agent'),
          requestId: (req as any).requestId,
          metadata: {
            pattern: pattern.toString(),
            suspiciousContent: requestData.substring(0, 200),
          },
        });
        break;
      }
    }

    next();
  }
}
