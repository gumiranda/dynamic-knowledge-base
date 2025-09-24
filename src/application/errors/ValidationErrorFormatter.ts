import { ValidationError as ClassValidationError } from 'class-validator';

/**
 * Formats validation errors into consistent, user-friendly messages
 */
export class ValidationErrorFormatter {
  /**
   * Formats class-validator errors into a structured response
   */
  static formatClassValidatorErrors(
    errors: ClassValidationError[]
  ): ValidationErrorResponse {
    const fieldErrors: FieldError[] = [];
    const generalErrors: string[] = [];

    for (const error of errors) {
      if (error.property && error.constraints) {
        fieldErrors.push({
          field: error.property,
          messages: Object.values(error.constraints),
          value: error.value,
        });
      } else if (error.constraints) {
        generalErrors.push(...Object.values(error.constraints));
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const nestedResult = this.formatClassValidatorErrors(error.children);

        // Prefix nested field names with parent property
        nestedResult.fieldErrors.forEach((fieldError) => {
          fieldError.field = `${error.property}.${fieldError.field}`;
        });

        fieldErrors.push(...nestedResult.fieldErrors);
        generalErrors.push(...nestedResult.generalErrors);
      }
    }

    return {
      fieldErrors,
      generalErrors,
      totalErrors: fieldErrors.length + generalErrors.length,
    };
  }

  /**
   * Formats validation errors into a simple string array
   */
  static formatToStringArray(errors: ClassValidationError[]): string[] {
    const result = this.formatClassValidatorErrors(errors);
    const messages: string[] = [];

    // Add field-specific errors
    result.fieldErrors.forEach((fieldError) => {
      fieldError.messages.forEach((message) => {
        messages.push(`${fieldError.field}: ${message}`);
      });
    });

    // Add general errors
    messages.push(...result.generalErrors);

    return messages;
  }

  /**
   * Creates a user-friendly error summary
   */
  static createErrorSummary(errors: ClassValidationError[]): string {
    const result = this.formatClassValidatorErrors(errors);

    if (result.totalErrors === 0) {
      return 'Validation failed';
    }

    if (result.totalErrors === 1) {
      if (result.fieldErrors.length > 0) {
        return result.fieldErrors[0].messages[0];
      }
      return result.generalErrors[0];
    }

    const fieldCount = result.fieldErrors.length;
    const generalCount = result.generalErrors.length;

    if (fieldCount > 0 && generalCount === 0) {
      return `${fieldCount} field validation error${fieldCount > 1 ? 's' : ''}`;
    }

    if (fieldCount === 0 && generalCount > 0) {
      return `${generalCount} validation error${generalCount > 1 ? 's' : ''}`;
    }

    return `${result.totalErrors} validation errors`;
  }

  /**
   * Creates a detailed error response for API responses
   */
  static createDetailedErrorResponse(
    errors: ClassValidationError[],
    message?: string
  ): DetailedValidationErrorResponse {
    const result = this.formatClassValidatorErrors(errors);

    return {
      status: 'validation_error',
      message: message || this.createErrorSummary(errors),
      details: result,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Interface for field-specific validation errors
 */
export interface FieldError {
  field: string;
  messages: string[];
  value?: any;
}

/**
 * Interface for structured validation error response
 */
export interface ValidationErrorResponse {
  fieldErrors: FieldError[];
  generalErrors: string[];
  totalErrors: number;
}

/**
 * Interface for detailed API error response
 */
export interface DetailedValidationErrorResponse {
  status: 'validation_error';
  message: string;
  details: ValidationErrorResponse;
  timestamp: string;
}
