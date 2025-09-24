import { ValidationError as ClassValidationError } from 'class-validator';
import { ValidationErrorFormatter } from '../ValidationErrorFormatter';

describe('ValidationErrorFormatter', () => {
  const createMockValidationError = (
    property: string,
    constraints: Record<string, string>,
    value?: any,
    children?: ClassValidationError[]
  ): ClassValidationError => {
    const error = new ClassValidationError();
    error.property = property;
    error.constraints = constraints;
    error.value = value;
    error.children = children || [];
    return error;
  };

  describe('formatClassValidatorErrors', () => {
    it('should format simple field errors', () => {
      const errors = [
        createMockValidationError(
          'name',
          {
            isNotEmpty: 'Name is required',
            minLength: 'Name must be at least 2 characters',
          },
          ''
        ),
        createMockValidationError(
          'email',
          {
            isEmail: 'Email must be a valid email address',
          },
          'invalid-email'
        ),
      ];

      const result =
        ValidationErrorFormatter.formatClassValidatorErrors(errors);

      expect(result.fieldErrors).toHaveLength(2);
      expect(result.fieldErrors[0]).toEqual({
        field: 'name',
        messages: ['Name is required', 'Name must be at least 2 characters'],
        value: '',
      });
      expect(result.fieldErrors[1]).toEqual({
        field: 'email',
        messages: ['Email must be a valid email address'],
        value: 'invalid-email',
      });
      expect(result.generalErrors).toHaveLength(0);
      expect(result.totalErrors).toBe(2);
    });

    it('should format nested validation errors', () => {
      const nestedError = createMockValidationError('bio', {
        maxLength: 'Bio must not exceed 500 characters',
      });

      const parentError = createMockValidationError('profile', {}, undefined, [
        nestedError,
      ]);

      const errors = [parentError];

      const result =
        ValidationErrorFormatter.formatClassValidatorErrors(errors);

      // Should have 2 field errors: one for parent (empty) and one for nested
      expect(result.fieldErrors).toHaveLength(2);
      expect(result.fieldErrors[1].field).toBe('profile.bio');
      expect(result.fieldErrors[1].messages).toEqual([
        'Bio must not exceed 500 characters',
      ]);
    });

    it('should handle errors without property names as general errors', () => {
      const error = new ClassValidationError();
      error.constraints = {
        custom: 'General validation error',
      };

      const result = ValidationErrorFormatter.formatClassValidatorErrors([
        error,
      ]);

      expect(result.fieldErrors).toHaveLength(0);
      expect(result.generalErrors).toEqual(['General validation error']);
      expect(result.totalErrors).toBe(1);
    });
  });

  describe('formatToStringArray', () => {
    it('should format errors as string array', () => {
      const errors = [
        createMockValidationError('name', {
          isNotEmpty: 'Name is required',
        }),
        createMockValidationError('email', {
          isEmail: 'Email must be valid',
        }),
      ];

      const result = ValidationErrorFormatter.formatToStringArray(errors);

      expect(result).toEqual([
        'name: Name is required',
        'email: Email must be valid',
      ]);
    });

    it('should include general errors in string array', () => {
      const fieldError = createMockValidationError('name', {
        isNotEmpty: 'Name is required',
      });

      const generalError = new ClassValidationError();
      generalError.constraints = {
        custom: 'General error',
      };

      const result = ValidationErrorFormatter.formatToStringArray([
        fieldError,
        generalError,
      ]);

      expect(result).toEqual(['name: Name is required', 'General error']);
    });
  });

  describe('createErrorSummary', () => {
    it('should return single error message for one error', () => {
      const errors = [
        createMockValidationError('name', {
          isNotEmpty: 'Name is required',
        }),
      ];

      const summary = ValidationErrorFormatter.createErrorSummary(errors);
      expect(summary).toBe('Name is required');
    });

    it('should return count for multiple field errors', () => {
      const errors = [
        createMockValidationError('name', {
          isNotEmpty: 'Name is required',
        }),
        createMockValidationError('email', {
          isEmail: 'Email is invalid',
        }),
      ];

      const summary = ValidationErrorFormatter.createErrorSummary(errors);
      expect(summary).toBe('2 field validation errors');
    });

    it('should return count for multiple general errors', () => {
      const error1 = new ClassValidationError();
      error1.constraints = { custom1: 'Error 1' };

      const error2 = new ClassValidationError();
      error2.constraints = { custom2: 'Error 2' };

      const summary = ValidationErrorFormatter.createErrorSummary([
        error1,
        error2,
      ]);
      expect(summary).toBe('2 validation errors');
    });

    it('should return total count for mixed errors', () => {
      const fieldError = createMockValidationError('name', {
        isNotEmpty: 'Name is required',
      });

      const generalError = new ClassValidationError();
      generalError.constraints = { custom: 'General error' };

      const summary = ValidationErrorFormatter.createErrorSummary([
        fieldError,
        generalError,
      ]);
      expect(summary).toBe('2 validation errors');
    });

    it('should return default message for no errors', () => {
      const summary = ValidationErrorFormatter.createErrorSummary([]);
      expect(summary).toBe('Validation failed');
    });
  });

  describe('createDetailedErrorResponse', () => {
    it('should create detailed error response', () => {
      const errors = [
        createMockValidationError('name', {
          isNotEmpty: 'Name is required',
        }),
      ];

      const response =
        ValidationErrorFormatter.createDetailedErrorResponse(errors);

      expect(response.status).toBe('validation_error');
      expect(response.message).toBe('Name is required');
      expect(response.details.fieldErrors).toHaveLength(1);
      expect(response.details.totalErrors).toBe(1);
      expect(response.timestamp).toBeDefined();
    });

    it('should use custom message when provided', () => {
      const errors = [
        createMockValidationError('name', {
          isNotEmpty: 'Name is required',
        }),
      ];

      const response = ValidationErrorFormatter.createDetailedErrorResponse(
        errors,
        'Custom validation message'
      );

      expect(response.message).toBe('Custom validation message');
    });
  });
});
