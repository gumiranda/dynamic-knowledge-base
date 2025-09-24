import { Request, Response, NextFunction } from 'express';
import { ValidationUtils, ValidationFactory } from '../ValidationUtils';

// Mock express objects
const mockRequest = (
  body: any = {},
  params: any = {},
  query: any = {},
  method: string = 'POST',
  path: string = '/test'
): Partial<Request> => ({
  body,
  params,
  query,
  method,
  path,
  get: jest.fn().mockReturnValue('application/json'),
});

const mockResponse = (): Partial<Response> => ({});
const mockNext = jest.fn() as NextFunction;

describe('ValidationUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pre-configured middleware', () => {
    it('should have all required validation middleware defined', () => {
      expect(ValidationUtils.contentType).toBeDefined();
      expect(ValidationUtils.sanitize).toBeDefined();
      expect(ValidationUtils.validateRegisterUser).toBeDefined();
      expect(ValidationUtils.validateUpdateUser).toBeDefined();
      expect(ValidationUtils.validateCreateTopic).toBeDefined();
      expect(ValidationUtils.validateUpdateTopic).toBeDefined();
      expect(ValidationUtils.validateCreateResource).toBeDefined();
      expect(ValidationUtils.validateUpdateResource).toBeDefined();
      expect(ValidationUtils.validateIdParam).toBeDefined();
      expect(ValidationUtils.validatePagination).toBeDefined();
    });
  });

  describe('validateRequestBody', () => {
    it('should return array of middleware functions', () => {
      const middleware = ValidationUtils.validateRequestBody(class TestDto {});
      expect(Array.isArray(middleware)).toBe(true);
      expect(middleware).toHaveLength(3);
    });
  });

  describe('validateRequestParams', () => {
    it('should return array of middleware functions', () => {
      const middleware = ValidationUtils.validateRequestParams(
        class TestDto {}
      );
      expect(Array.isArray(middleware)).toBe(true);
      expect(middleware).toHaveLength(2);
    });
  });

  describe('validateIdEndpoint', () => {
    it('should return array of middleware functions for ID validation', () => {
      const middleware = ValidationUtils.validateIdEndpoint();
      expect(Array.isArray(middleware)).toBe(true);
      expect(middleware).toHaveLength(2);
    });
  });

  describe('validateIdAndBody', () => {
    it('should return array of middleware functions for ID and body validation', () => {
      const middleware = ValidationUtils.validateIdAndBody(class TestDto {});
      expect(Array.isArray(middleware)).toBe(true);
      expect(middleware).toHaveLength(4);
    });
  });

  describe('legacy validation methods', () => {
    it('should provide access to legacy validation methods', () => {
      expect(ValidationUtils.legacy.validateRequiredFields).toBeDefined();
      expect(ValidationUtils.legacy.validateFields).toBeDefined();
      expect(ValidationUtils.legacy.validateUrl).toBeDefined();
      expect(ValidationUtils.legacy.validateEmail).toBeDefined();
      expect(ValidationUtils.legacy.validateEnum).toBeDefined();
    });
  });
});

describe('ValidationFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('combine', () => {
    it('should combine multiple middleware functions', async () => {
      const middleware1 = jest.fn((_req, _res, next) => next());
      const middleware2 = jest.fn((_req, _res, next) => next());
      const middleware3 = jest.fn((_req, _res, next) => next());

      const combined = ValidationFactory.combine(
        middleware1,
        middleware2,
        middleware3
      );

      const req = mockRequest();
      const res = mockResponse();

      combined(req as Request, res as Response, mockNext);

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(middleware1).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(middleware2).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(middleware3).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should stop execution on error', async () => {
      const error = new Error('Test error');
      const middleware1 = jest.fn((_req, _res, next) => next());
      const middleware2 = jest.fn((_req, _res, next) => next(error));
      const middleware3 = jest.fn((_req, _res, next) => next());

      const combined = ValidationFactory.combine(
        middleware1,
        middleware2,
        middleware3
      );

      const req = mockRequest();
      const res = mockResponse();

      combined(req as Request, res as Response, mockNext);

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
      expect(middleware3).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous errors', () => {
      const error = new Error('Sync error');
      const middleware1 = jest.fn((_req, _res, _next) => {
        throw error;
      });
      const middleware2 = jest.fn();

      const combined = ValidationFactory.combine(middleware1, middleware2);

      const req = mockRequest();
      const res = mockResponse();

      combined(req as Request, res as Response, mockNext);

      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('conditional', () => {
    it('should run middleware when condition is true', () => {
      const middleware = jest.fn((_req, _res, next) => next());
      const condition = jest.fn().mockReturnValue(true);

      const conditional = ValidationFactory.conditional(condition, middleware);

      const req = mockRequest();
      const res = mockResponse();

      conditional(req as Request, res as Response, mockNext);

      expect(condition).toHaveBeenCalledWith(req);
      expect(middleware).toHaveBeenCalledWith(req, res, mockNext);
    });

    it('should skip middleware when condition is false', () => {
      const middleware = jest.fn((_req, _res, next) => next());
      const condition = jest.fn().mockReturnValue(false);

      const conditional = ValidationFactory.conditional(condition, middleware);

      const req = mockRequest();
      const res = mockResponse();

      conditional(req as Request, res as Response, mockNext);

      expect(condition).toHaveBeenCalledWith(req);
      expect(middleware).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('forMethods', () => {
    it('should run middleware for specified methods', () => {
      const middleware = jest.fn((_req, _res, next) => next());
      const methodSpecific = ValidationFactory.forMethods(
        ['POST', 'PUT'],
        middleware
      );

      const postReq = mockRequest({}, {}, {}, 'POST');
      const putReq = mockRequest({}, {}, {}, 'PUT');
      const getReq = mockRequest({}, {}, {}, 'GET');

      // Test POST request
      methodSpecific(postReq as Request, mockResponse() as Response, mockNext);
      expect(middleware).toHaveBeenCalledTimes(1);

      // Test PUT request
      methodSpecific(putReq as Request, mockResponse() as Response, mockNext);
      expect(middleware).toHaveBeenCalledTimes(2);

      // Test GET request (should be skipped)
      methodSpecific(getReq as Request, mockResponse() as Response, mockNext);
      expect(middleware).toHaveBeenCalledTimes(2); // Still 2, not called for GET
    });

    it('should be case insensitive for method matching', () => {
      const middleware = jest.fn((_req, _res, next) => next());
      const methodSpecific = ValidationFactory.forMethods(['post'], middleware);

      const postReq = mockRequest({}, {}, {}, 'POST');
      methodSpecific(postReq as Request, mockResponse() as Response, mockNext);

      expect(middleware).toHaveBeenCalledTimes(1);
    });
  });
});
