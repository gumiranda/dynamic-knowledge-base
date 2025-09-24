import { Request, Response, NextFunction } from 'express';
import { ClassValidationMiddleware } from '../ClassValidationMiddleware';
import { ValidationError } from '../../../application/errors/AppError';
import { RegisterUserDto, CreateTopicDto } from '../../../application/dtos';

// Mock express objects
const mockRequest = (
  body: any = {},
  params: any = {},
  query: any = {}
): Partial<Request> => ({
  body,
  params,
  query,
});

const mockResponse = (): Partial<Response> => ({});

const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

describe('ClassValidationMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateBody', () => {
    it('should pass validation with valid user data', async () => {
      const req = mockRequest({
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Editor',
      });

      const middleware =
        ClassValidationMiddleware.validateBody(RegisterUserDto);
      await middleware(req as Request, mockResponse() as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.body).toBeInstanceOf(RegisterUserDto);
      expect(req.body.name).toBe('John Doe');
      expect(req.body.email).toBe('john@example.com');
    });

    it('should fail validation with missing required fields', async () => {
      const req = mockRequest({
        name: 'John Doe',
        // missing email and role
      });

      const middleware =
        ClassValidationMiddleware.validateBody(RegisterUserDto);
      await middleware(req as Request, mockResponse() as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = mockNext.mock.calls[0][0] as unknown as ValidationError;
      expect(error.message).toContain('Validation failed');
    });

    it('should fail validation with invalid email format', async () => {
      const req = mockRequest({
        name: 'John Doe',
        email: 'invalid-email',
        role: 'Editor',
      });

      const middleware =
        ClassValidationMiddleware.validateBody(RegisterUserDto);
      await middleware(req as Request, mockResponse() as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = mockNext.mock.calls[0][0] as unknown as ValidationError;
      expect(error.message).toContain('Email must be a valid email address');
    });

    it('should fail validation with invalid role', async () => {
      const req = mockRequest({
        name: 'John Doe',
        email: 'john@example.com',
        role: 'InvalidRole',
      });

      const middleware =
        ClassValidationMiddleware.validateBody(RegisterUserDto);
      await middleware(req as Request, mockResponse() as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = mockNext.mock.calls[0][0] as unknown as ValidationError;
      expect(error.message).toContain('Role must be one of');
    });

    it('should transform and sanitize input data', async () => {
      const req = mockRequest({
        name: '  John Doe  ',
        email: '  JOHN@EXAMPLE.COM  ',
        role: 'Editor',
      });

      const middleware =
        ClassValidationMiddleware.validateBody(RegisterUserDto);
      await middleware(req as Request, mockResponse() as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.body.name).toBe('John Doe');
      expect(req.body.email).toBe('john@example.com');
    });

    it('should reject non-whitelisted properties', async () => {
      const req = mockRequest({
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Editor',
        extraProperty: 'should be removed',
      });

      const middleware =
        ClassValidationMiddleware.validateBody(RegisterUserDto);
      await middleware(req as Request, mockResponse() as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('validateParams', () => {
    it('should validate topic creation parameters', async () => {
      const req = mockRequest(
        {},
        {
          startId: 'topic-1',
          endId: 'topic-2',
        }
      );

      const middleware =
        ClassValidationMiddleware.validateParams(CreateTopicDto);
      await middleware(req as Request, mockResponse() as Response, mockNext);

      // This should fail because CreateTopicDto expects body data, not params
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize XSS attempts in request body', () => {
      const req = mockRequest({
        name: '<script>alert("xss")</script>John',
        content: 'javascript:alert("xss")',
        description: 'Normal content',
      });

      ClassValidationMiddleware.sanitizeInput(
        req as Request,
        mockResponse() as Response,
        mockNext
      );

      expect(req.body.name).toBe('John'); // script tags removed
      expect(req.body.content).toBe('alert("xss")'); // javascript: protocol removed
      expect(req.body.description).toBe('Normal content');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should sanitize nested objects', () => {
      const req = mockRequest({
        user: {
          name: '<script>alert("xss")</script>John',
          profile: {
            bio: 'javascript:void(0)',
          },
        },
      });

      ClassValidationMiddleware.sanitizeInput(
        req as Request,
        mockResponse() as Response,
        mockNext
      );

      expect(req.body.user.name).toBe('John'); // script tags removed
      expect(req.body.user.profile.bio).toBe('void(0)'); // javascript: protocol removed
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should sanitize arrays', () => {
      const req = mockRequest({
        tags: ['<script>alert("xss")</script>tag1', 'normal-tag'],
      });

      ClassValidationMiddleware.sanitizeInput(
        req as Request,
        mockResponse() as Response,
        mockNext
      );

      expect(req.body.tags[0]).toBe('tag1');
      expect(req.body.tags[1]).toBe('normal-tag');
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateContentType', () => {
    it('should pass for GET requests', () => {
      const req = {
        method: 'GET',
        path: '/topics',
      } as Request;

      ClassValidationMiddleware.validateContentType(
        req,
        mockResponse() as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass for health check', () => {
      const req = {
        method: 'POST',
        path: '/health',
      } as Request;

      ClassValidationMiddleware.validateContentType(
        req,
        mockResponse() as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should require JSON content type for POST requests', () => {
      const req = {
        method: 'POST',
        path: '/topics',
        get: jest.fn().mockReturnValue('text/plain'),
      } as unknown as Request;

      expect(() => {
        ClassValidationMiddleware.validateContentType(
          req,
          mockResponse() as Response,
          mockNext
        );
      }).toThrow(ValidationError);
    });

    it('should pass with correct JSON content type', () => {
      const req = {
        method: 'POST',
        path: '/topics',
        get: jest.fn().mockReturnValue('application/json'),
      } as unknown as Request;

      ClassValidationMiddleware.validateContentType(
        req,
        mockResponse() as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
