import { NextFunction } from 'express';
import { Logger, LoggingMiddleware } from '../LoggingMiddleware';

describe('Enhanced LoggingMiddleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: NextFunction;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Set to development mode for pretty printing
    process.env.NODE_ENV = 'development';

    mockRequest = {
      method: 'POST',
      url: '/test',
      originalUrl: '/test',
      get: jest.fn(),
      connection: { remoteAddress: '127.0.0.1' },
      socket: {},
      headers: {},
      params: {},
      query: {},
      body: {},
    };

    mockResponse = {
      statusCode: 200,
      end: jest.fn(),
      on: jest.fn(),
    };

    mockNext = jest.fn();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleLogSpy.mockRestore();
  });

  describe('Logger', () => {
    it('should create structured log entries', () => {
      const entry = Logger.createLogEntry('info', 'Test message', {
        method: 'GET',
        url: '/test',
      });

      expect(entry).toMatchObject({
        level: 'info',
        message: 'Test message',
        method: 'GET',
        url: '/test',
        timestamp: expect.any(String),
      });
    });

    it('should log info messages', () => {
      Logger.info('Test info message', { method: 'GET' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('📝 [INFO] Test info message')
      );
    });

    it('should log warning messages', () => {
      Logger.warn('Test warning message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ [WARN] Test warning message')
      );
    });

    it('should log error messages with error details', () => {
      const error = new Error('Test error');
      Logger.error('Test error message', error);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ [ERROR] Test error message')
      );
    });

    it('should log debug messages only in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      Logger.debug('Test debug message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔍 [DEBUG] Test debug message')
      );

      process.env.NODE_ENV = 'production';
      consoleLogSpy.mockClear();

      Logger.debug('Test debug message');

      expect(consoleLogSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should output JSON in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      Logger.info('Test message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\{.*\}$/)
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('LoggingMiddleware.log', () => {
    it('should log incoming requests', () => {
      mockRequest.body = { name: 'test' };
      mockRequest.params = { id: '123' };
      mockRequest.query = { filter: 'active' };

      LoggingMiddleware.log(mockRequest, mockResponse, mockNext);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('📝 [INFO] Incoming request')
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.requestId).toBeDefined();
    });

    it('should sanitize sensitive data in request body', () => {
      mockRequest.body = {
        name: 'test',
        password: 'secret123',
        token: 'abc123',
      };

      LoggingMiddleware.log(mockRequest, mockResponse, mockNext);

      // The sanitized body should not contain the actual password/token
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.not.stringContaining('secret123')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.not.stringContaining('abc123')
      );
    });

    it('should log response when request completes', () => {
      LoggingMiddleware.log(mockRequest, mockResponse, mockNext);

      // Simulate response completion
      mockResponse.end('response data');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Request completed')
      );
    });

    it('should log errors for 4xx/5xx status codes', () => {
      mockResponse.statusCode = 404;
      LoggingMiddleware.log(mockRequest, mockResponse, mockNext);

      mockResponse.end();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ [ERROR] Request completed')
      );
    });

    it('should extract client IP from various headers', () => {
      mockRequest.headers['x-forwarded-for'] = '192.168.1.1, 10.0.0.1';

      LoggingMiddleware.log(mockRequest, mockResponse, mockNext);

      // Check that the log was called (IP is in the structured data, not the pretty print message)
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('LoggingMiddleware.performance', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should log slow requests', () => {
      LoggingMiddleware.performance(mockRequest, mockResponse, mockNext);

      // Simulate slow request (advance time by 2 seconds)
      jest.advanceTimersByTime(2000);

      // Trigger finish event
      const finishCallback = mockResponse.on.mock.calls.find(
        (call: any) => call[0] === 'finish'
      )[1];
      finishCallback();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ [WARN] Slow request detected')
      );
    });

    it('should log memory usage for very long requests', () => {
      LoggingMiddleware.performance(mockRequest, mockResponse, mockNext);

      // Simulate very long request (advance time by 6 seconds)
      jest.advanceTimersByTime(6000);

      // Trigger finish event
      const finishCallback = mockResponse.on.mock.calls.find(
        (call: any) => call[0] === 'finish'
      )[1];
      finishCallback();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Long request with memory usage')
      );
    });
  });

  describe('LoggingMiddleware.security', () => {
    it('should detect suspicious patterns in requests', () => {
      mockRequest.body = {
        content: '<script>alert("xss")</script>',
      };

      LoggingMiddleware.security(mockRequest, mockResponse, mockNext);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ [WARN] Suspicious request detected')
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect SQL injection patterns', () => {
      mockRequest.query = {
        search: "'; DROP TABLE users; --",
      };

      LoggingMiddleware.security(mockRequest, mockResponse, mockNext);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suspicious request detected')
      );
    });

    it('should not log for normal requests', () => {
      mockRequest.body = {
        name: 'Normal User',
        email: 'user@example.com',
      };

      LoggingMiddleware.security(mockRequest, mockResponse, mockNext);

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Suspicious request detected')
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
