import { ValidationRule } from '../../infrastructure/middleware/ValidationMiddleware';
import { UserRole } from '../../domain/enums/UserRole';
import { ResourceType } from '../../domain/enums/ResourceType';

/**
 * Validation schemas for different entities
 */
export class ValidationSchemas {
  /**
   * User creation validation rules
   */
  static readonly createUser: ValidationRule[] = [
    {
      field: 'name',
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 100,
      message: 'Name must be between 2 and 100 characters',
    },
    {
      field: 'email',
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Email must be a valid email address',
    },
    {
      field: 'role',
      required: true,
      type: 'string',
      validator: (value: string) =>
        Object.values(UserRole).includes(value as UserRole),
      message: `Role must be one of: ${Object.values(UserRole).join(', ')}`,
    },
  ];

  /**
   * User update validation rules
   */
  static readonly updateUser: ValidationRule[] = [
    {
      field: 'name',
      required: false,
      type: 'string',
      minLength: 2,
      maxLength: 100,
      message: 'Name must be between 2 and 100 characters',
    },
    {
      field: 'email',
      required: false,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Email must be a valid email address',
    },
    {
      field: 'role',
      required: false,
      type: 'string',
      validator: (value: string) =>
        Object.values(UserRole).includes(value as UserRole),
      message: `Role must be one of: ${Object.values(UserRole).join(', ')}`,
    },
  ];

  /**
   * Topic creation validation rules
   */
  static readonly createTopic: ValidationRule[] = [
    {
      field: 'name',
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 200,
      message: 'Topic name must be between 1 and 200 characters',
    },
    {
      field: 'content',
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 10000,
      message: 'Topic content must be between 1 and 10000 characters',
    },
    {
      field: 'parentTopicId',
      required: false,
      type: 'string',
      pattern: /^[a-zA-Z0-9-_]+$/,
      message:
        'Parent topic ID must contain only alphanumeric characters, hyphens, and underscores',
    },
  ];

  /**
   * Topic update validation rules
   */
  static readonly updateTopic: ValidationRule[] = [
    {
      field: 'name',
      required: false,
      type: 'string',
      minLength: 1,
      maxLength: 200,
      message: 'Topic name must be between 1 and 200 characters',
    },
    {
      field: 'content',
      required: false,
      type: 'string',
      minLength: 1,
      maxLength: 10000,
      message: 'Topic content must be between 1 and 10000 characters',
    },
    {
      field: 'parentTopicId',
      required: false,
      type: 'string',
      pattern: /^[a-zA-Z0-9-_]+$/,
      message:
        'Parent topic ID must contain only alphanumeric characters, hyphens, and underscores',
    },
  ];

  /**
   * Resource creation validation rules
   */
  static readonly createResource: ValidationRule[] = [
    {
      field: 'topicId',
      required: true,
      type: 'string',
      pattern: /^[a-zA-Z0-9-_]+$/,
      message:
        'Topic ID must contain only alphanumeric characters, hyphens, and underscores',
    },
    {
      field: 'url',
      required: true,
      type: 'string',
      validator: (value: string) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message: 'URL must be a valid URL',
    },
    {
      field: 'description',
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 500,
      message: 'Description must be between 1 and 500 characters',
    },
    {
      field: 'type',
      required: true,
      type: 'string',
      validator: (value: string) =>
        Object.values(ResourceType).includes(value as ResourceType),
      message: `Resource type must be one of: ${Object.values(ResourceType).join(', ')}`,
    },
  ];

  /**
   * Resource update validation rules
   */
  static readonly updateResource: ValidationRule[] = [
    {
      field: 'url',
      required: false,
      type: 'string',
      validator: (value: string) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message: 'URL must be a valid URL',
    },
    {
      field: 'description',
      required: false,
      type: 'string',
      minLength: 1,
      maxLength: 500,
      message: 'Description must be between 1 and 500 characters',
    },
    {
      field: 'type',
      required: false,
      type: 'string',
      validator: (value: string) =>
        Object.values(ResourceType).includes(value as ResourceType),
      message: `Resource type must be one of: ${Object.values(ResourceType).join(', ')}`,
    },
  ];

  /**
   * Path finding validation rules
   */
  static readonly findPath: ValidationRule[] = [
    {
      field: 'startId',
      required: true,
      type: 'string',
      pattern: /^[a-zA-Z0-9-_]+$/,
      message:
        'Start topic ID must contain only alphanumeric characters, hyphens, and underscores',
    },
    {
      field: 'endId',
      required: true,
      type: 'string',
      pattern: /^[a-zA-Z0-9-_]+$/,
      message:
        'End topic ID must contain only alphanumeric characters, hyphens, and underscores',
    },
  ];
}
