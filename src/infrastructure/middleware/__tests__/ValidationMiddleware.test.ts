import { Request, Response, NextFunction } from 'express';
import { ValidationMiddleware, ValidationRule } from '../ValidationMiddleware';
import { ValidationError } from '../../../application/errors/AppError';

describe('ValidationMiddleware', () => {
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      path: '/test',
      get: jest.fn(),
      body: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateContentType', () => {
    it('should skip validation for GET requests', () => {
      mockRequest.method = 'GET';

      ValidationMiddleware.validateContentType(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip validation for health check', () => {
      mockRequest.path = '/health';

      ValidationMiddleware.validateContentType(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate Content-Type for POST requests', () => {
      (mockRequest.get as jest.Mock).mockReturnValue('application/json');

      ValidationMiddleware.validateContentType(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error for invalid Content-Type', () => {
      (mockRequest.get as jest.Mock).mockReturnValue('text/plain');

      expect(() => {
        ValidationMiddleware.validateContentType(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );
      }).toThrow(ValidationError);
    });

    it('should throw error for missing Content-Type', () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      expect(() => {
        ValidationMiddleware.validateContentType(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );
      }).toThrow('Content-Type must be application/json');
    });
  });

  describe('validateRequiredFields', () => {
    it('should pass validation when all required fields are present', () => {
      mockRequest.body = {
        name: 'Test Name',
        email: 'test@example.com',
      };

      const middleware = ValidationMiddleware.validateRequiredFields([
        'name',
        'email',
      ]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error for missing required fields', () => {
      mockRequest.body = {
        name: 'Test Name',
      };

      const middleware = ValidationMiddleware.validateRequiredFields([
        'name',
        'email',
      ]);

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow('Missing required fields: email');
    });

    it('should throw error for empty string fields', () => {
      mockRequest.body = {
        name: '',
        email: 'test@example.com',
      };

      const middleware = ValidationMiddleware.validateRequiredFields([
        'name',
        'email',
      ]);

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow('Missing required fields: name');
    });

    it('should throw error for null fields', () => {
      mockRequest.body = {
        name: null,
        email: 'test@example.com',
      };

      const middleware = ValidationMiddleware.validateRequiredFields([
        'name',
        'email',
      ]);

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow('Missing required fields: name');
    });
  });

  describe('validateFields', () => {
    it('should validate required fields', () => {
      const rules: ValidationRule[] = [
        { field: 'name', required: true },
        { field: 'email', required: true },
      ];

      mockRequest.body = {
        name: 'Test Name',
        email: 'test@example.com',
      };

      const middleware = ValidationMiddleware.validateFields(rules);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate field types', () => {
      const rules: ValidationRule[] = [
        { field: 'name', type: 'string' },
        { field: 'age', type: 'number' },
        { field: 'active', type: 'boolean' },
        { field: 'tags', type: 'array' },
        { field: 'metadata', type: 'object' },
      ];

      mockRequest.body = {
        name: 'Test Name',
        age: 25,
        active: true,
        tags: ['tag1', 'tag2'],
        metadata: { key: 'value' },
      };

      const middleware = ValidationMiddleware.validateFields(rules);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error for invalid types', () => {
      const rules: ValidationRule[] = [{ field: 'age', type: 'number' }];

      mockRequest.body = {
        age: 'not a number',
      };

      const middleware = ValidationMiddleware.validateFields(rules);

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow("Field 'age' must be of type number");
    });

    it('should validate string length', () => {
      const rules: ValidationRule[] = [
        { field: 'name', type: 'string', minLength: 2, maxLength: 10 },
      ];

      mockRequest.body = {
        name: 'Valid',
      };

      const middleware = ValidationMiddleware.validateFields(rules);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error for string too short', () => {
      const rules: ValidationRule[] = [
        { field: 'name', type: 'string', minLength: 5 },
      ];

      mockRequest.body = {
        name: 'Hi',
      };

      const middleware = ValidationMiddleware.validateFields(rules);

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow("Field 'name' must be at least 5 characters long");
    });

    it('should throw error for string too long', () => {
      const rules: ValidationRule[] = [
        { field: 'name', type: 'string', maxLength: 5 },
      ];

      mockRequest.body = {
        name: 'This is too long',
      };

      const middleware = ValidationMiddleware.validateFields(rules);

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow("Field 'name' must be no more than 5 characters long");
    });

    it('should validate patterns', () => {
      const rules: ValidationRule[] = [
        { field: 'email', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      ];

      mockRequest.body = {
        email: 'test@example.com',
      };

      const middleware = ValidationMiddleware.validateFields(rules);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error for invalid patterns', () => {
      const rules: ValidationRule[] = [
        { field: 'email', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      ];

      mockRequest.body = {
        email: 'invalid-email',
      };

      const middleware = ValidationMiddleware.validateFields(rules);

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow("Field 'email' format is invalid");
    });

    it('should use custom validators', () => {
      const rules: ValidationRule[] = [
        {
          field: 'age',
          validator: (value: number) => value >= 18,
          message: 'Age must be 18 or older',
        },
      ];

      mockRequest.body = {
        age: 25,
      };

      const middleware = ValidationMiddleware.validateFields(rules);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error for failed custom validation', () => {
      const rules: ValidationRule[] = [
        {
          field: 'age',
          validator: (value: number) => value >= 18,
          message: 'Age must be 18 or older',
        },
      ];

      mockRequest.body = {
        age: 16,
      };

      const middleware = ValidationMiddleware.validateFields(rules);

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow('Age must be 18 or older');
    });

    it('should skip validation for optional missing fields', () => {
      const rules: ValidationRule[] = [
        { field: 'optionalField', required: false, type: 'string' },
      ];

      mockRequest.body = {};

      const middleware = ValidationMiddleware.validateFields(rules);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateUrl', () => {
    it('should validate valid URLs', () => {
      mockRequest.body = {
        url: 'https://example.com',
      };

      const middleware = ValidationMiddleware.validateUrl();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error for invalid URLs', () => {
      mockRequest.body = {
        url: 'not-a-url',
      };

      const middleware = ValidationMiddleware.validateUrl();

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow("Field 'url' must be a valid URL");
    });

    it('should validate custom field names', () => {
      mockRequest.body = {
        website: 'https://example.com',
      };

      const middleware = ValidationMiddleware.validateUrl('website');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateEmail', () => {
    it('should validate valid emails', () => {
      mockRequest.body = {
        email: 'test@example.com',
      };

      const middleware = ValidationMiddleware.validateEmail();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error for invalid emails', () => {
      mockRequest.body = {
        email: 'invalid-email',
      };

      const middleware = ValidationMiddleware.validateEmail();

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow("Field 'email' must be a valid email address");
    });
  });

  describe('validateEnum', () => {
    it('should validate enum values', () => {
      mockRequest.body = {
        role: 'Admin',
      };

      const middleware = ValidationMiddleware.validateEnum('role', [
        'Admin',
        'Editor',
        'Viewer',
      ]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error for invalid enum values', () => {
      mockRequest.body = {
        role: 'InvalidRole',
      };

      const middleware = ValidationMiddleware.validateEnum('role', [
        'Admin',
        'Editor',
        'Viewer',
      ]);

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow("Field 'role' must be one of: Admin, Editor, Viewer");
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize script tags', () => {
      mockRequest.body = {
        content: 'Hello <script>alert("xss")</script> World',
      };

      ValidationMiddleware.sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.body.content).toBe('Hello  World');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should trim whitespace', () => {
      mockRequest.body = {
        name: '  Test Name  ',
      };

      ValidationMiddleware.sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.body.name).toBe('Test Name');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle nested objects', () => {
      mockRequest.body = {
        user: {
          name: '  John  ',
          bio: 'Hello <script>alert("xss")</script> World',
        },
      };

      ValidationMiddleware.sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.body.user.name).toBe('John');
      expect(mockRequest.body.user.bio).toBe('Hello  World');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle arrays', () => {
      mockRequest.body = {
        tags: ['  tag1  ', 'tag2<script>alert("xss")</script>'],
      };

      ValidationMiddleware.sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.body.tags).toEqual(['tag1', 'tag2']);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
