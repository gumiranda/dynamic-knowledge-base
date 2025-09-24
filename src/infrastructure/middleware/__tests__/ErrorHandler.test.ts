import { Request, Response, NextFunction } from 'express';
import { ErrorHandler } from '../ErrorHandler';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
} from '../../../application/errors/AppError';

describe('ErrorHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });

    mockRequest = {
      originalUrl: '/test/path',
      url: '/test/path',
      method: 'POST',
      body: { test: 'data' },
      params: { id: '123' },
      query: { filter: 'active' },
      get: jest.fn(),
    };

    mockResponse = {
      status: statusSpy,
      json: jsonSpy,
    };

    mockNext = jest.fn();

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe('handle', () => {
    it('should handle ValidationError correctly', () => {
      const error = new ValidationError('Invalid input data');

      ErrorHandler.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Invalid input data',
          code: 'ValidationError',
          timestamp: expect.any(String),
          path: '/test/path',
          method: 'POST',
        })
      );
    });

    it('should handle NotFoundError correctly', () => {
      const error = new NotFoundError('Resource not found');

      ErrorHandler.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Resource not found',
          code: 'NotFoundError',
        })
      );
    });

    it('should handle UnauthorizedError correctly', () => {
      const error = new UnauthorizedError('Authentication required');

      ErrorHandler.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Authentication required',
          code: 'UnauthorizedError',
        })
      );
    });

    it('should handle ForbiddenError correctly', () => {
      const error = new ForbiddenError('Access denied');

      ErrorHandler.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Access denied',
          code: 'ForbiddenError',
        })
      );
    });

    it('should handle ConflictError correctly', () => {
      const error = new ConflictError('Resource already exists');

      ErrorHandler.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Resource already exists',
          code: 'ConflictError',
        })
      );
    });

    it('should handle InternalServerError correctly', () => {
      const error = new InternalServerError('Something went wrong');

      ErrorHandler.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Something went wrong',
          code: 'InternalServerError',
        })
      );
    });

    it('should handle AppError with cause', () => {
      const cause = new Error('Original cause');
      const error = new ValidationError('Validation failed', cause);

      ErrorHandler.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          details: {
            cause: 'Original cause',
          },
        })
      );
    });

    it('should handle generic validation errors', () => {
      const error = new Error('validation failed');

      ErrorHandler.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'validation failed',
          code: 'ValidationError',
        })
      );
    });

    it('should handle unexpected errors', () => {
      const error = new Error('Unexpected error');

      ErrorHandler.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Internal server error',
          code: 'InternalServerError',
        })
      );
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new ValidationError('Test error');

      ErrorHandler.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new ValidationError('Test error');

      ErrorHandler.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.not.objectContaining({
          stack: expect.any(String),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should log error details', () => {
      const error = new ValidationError('Test error');

      ErrorHandler.handle(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error occurred:',
        expect.objectContaining({
          message: 'Test error',
          stack: expect.any(String),
          url: '/test/path',
          method: 'POST',
          timestamp: expect.any(String),
          body: { test: 'data' },
          params: { id: '123' },
          query: { filter: 'active' },
        })
      );
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async operations', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = ErrorHandler.asyncHandler(asyncFn);

      await wrappedFn(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch and forward async errors', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = ErrorHandler.asyncHandler(asyncFn);

      await wrappedFn(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('notFound', () => {
    it('should create and forward 404 error', () => {
      ErrorHandler.notFound(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route not found: POST /test/path',
          name: 'NotFoundError',
        })
      );
    });
  });
});
