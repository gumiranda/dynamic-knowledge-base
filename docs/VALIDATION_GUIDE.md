# Validation System Guide

This guide explains how to use the comprehensive validation system implemented in the Dynamic Knowledge Base project.

## Overview

The validation system provides:

- **Class-based validation** using `class-validator` decorators
- **Automatic data transformation** and sanitization
- **Type-safe DTOs** with runtime validation
- **Comprehensive error handling** with detailed error messages
- **Security features** including XSS prevention
- **Flexible middleware** for different validation scenarios

## Key Components

### 1. DTOs (Data Transfer Objects)

DTOs are classes that define the structure and validation rules for API requests:

```typescript
import { IsNotEmpty, IsEmail, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterUserDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(UserRole, { message: 'Role must be one of: Admin, Editor, Viewer' })
  role: UserRole;
}
```

### 2. Validation Middleware

#### ClassValidationMiddleware

Core validation middleware that uses class-validator:

```typescript
import { ClassValidationMiddleware } from '../infrastructure/middleware';

// Validate request body
app.post(
  '/users',
  ClassValidationMiddleware.validateBody(RegisterUserDto),
  (req, res) => {
    // req.body is now validated and transformed
  }
);

// Validate request parameters
app.get(
  '/users/:id',
  ClassValidationMiddleware.validateParams(IdParamDto),
  (req, res) => {
    // req.params is validated
  }
);

// Validate query parameters
app.get(
  '/users',
  ClassValidationMiddleware.validateQuery(PaginationDto),
  (req, res) => {
    // req.query is validated
  }
);
```

#### ValidationUtils

Pre-configured validation chains for common scenarios:

```typescript
import { ValidationUtils } from '../infrastructure/middleware';

// Complete body validation chain (content-type + sanitization + validation)
app.post(
  '/users',
  ...ValidationUtils.validateRequestBody(RegisterUserDto),
  handler
);

// ID parameter validation
app.get('/users/:id', ...ValidationUtils.validateIdEndpoint(), handler);

// ID + body validation
app.put(
  '/users/:id',
  ...ValidationUtils.validateIdAndBody(UpdateUserDto),
  handler
);

// Search endpoint validation
app.get('/users/search', ...ValidationUtils.validateSearchEndpoint(), handler);
```

### 3. Security Features

#### Input Sanitization

Automatic sanitization prevents XSS attacks:

```typescript
// Before sanitization
{
  name: '<script>alert("xss")</script>John',
  content: 'javascript:alert("xss")'
}

// After sanitization
{
  name: 'John',
  content: 'alert("xss")'
}
```

#### Content-Type Validation

Ensures requests use proper JSON content type:

```typescript
app.use(ValidationUtils.contentType);
```

### 4. Error Handling

#### Structured Error Responses

Validation errors are formatted consistently:

```json
{
  "status": "validation_error",
  "message": "2 field validation errors",
  "details": {
    "fieldErrors": [
      {
        "field": "email",
        "messages": ["Email must be a valid email address"],
        "value": "invalid-email"
      },
      {
        "field": "name",
        "messages": ["Name is required"],
        "value": ""
      }
    ],
    "generalErrors": [],
    "totalErrors": 2
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Error Formatter

Use the ValidationErrorFormatter for custom error handling:

```typescript
import { ValidationErrorFormatter } from '../application/errors';

try {
  // validation logic
} catch (errors) {
  const formatted =
    ValidationErrorFormatter.createDetailedErrorResponse(errors);
  res.status(400).json(formatted);
}
```

## Usage Examples

### Basic Validation

```typescript
import { ValidationUtils } from '../infrastructure/middleware';
import { RegisterUserDto } from '../application/dtos';

app.post(
  '/users',
  ...ValidationUtils.validateRequestBody(RegisterUserDto),
  async (req, res) => {
    // req.body is guaranteed to be a valid RegisterUserDto
    const userData = req.body;
    const user = await userService.createUser(userData);
    res.status(201).json(user);
  }
);
```

### Custom Validation Chain

```typescript
import { ValidationFactory } from '../infrastructure/middleware';

const customValidation = ValidationFactory.combine(
  ValidationUtils.contentType,
  ValidationUtils.sanitize,
  ClassValidationMiddleware.validateBody(CustomDto)
  // Add custom middleware here
);

app.post('/custom', customValidation, handler);
```

### Conditional Validation

```typescript
import { ValidationFactory } from '../infrastructure/middleware';

// Only validate for POST and PUT requests
const conditionalValidation = ValidationFactory.forMethods(
  ['POST', 'PUT'],
  ValidationUtils.validateCreateTopic
);

app.use('/topics', conditionalValidation);
```

### Advanced DTO Features

#### Nested Validation

```typescript
export class CreateTopicDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => TopicMetadataDto)
  metadata: TopicMetadataDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TagDto)
  tags?: TagDto[];
}
```

#### Custom Validators

```typescript
import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsUniqueEmail(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUniqueEmail',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          // Custom validation logic
          return userService.isEmailUnique(value);
        },
      },
    });
  };
}

export class RegisterUserDto {
  @IsEmail()
  @IsUniqueEmail({ message: 'Email already exists' })
  email: string;
}
```

## Available DTOs

### User DTOs

- `RegisterUserDto` - User registration
- `UpdateUserDto` - User updates
- `AuthenticateUserDto` - User authentication

### Topic DTOs

- `CreateTopicDto` - Topic creation
- `UpdateTopicDto` - Topic updates

### Resource DTOs

- `CreateResourceDto` - Resource creation
- `UpdateResourceDto` - Resource updates

### Common DTOs

- `IdParamDto` - ID parameter validation
- `PaginationDto` - Pagination parameters
- `SearchDto` - Search with pagination
- `VersionParamDto` - Version parameter validation
- `HierarchyQueryDto` - Hierarchy query parameters

## Best Practices

### 1. Always Use DTOs

```typescript
// ✅ Good
app.post(
  '/users',
  ...ValidationUtils.validateRequestBody(RegisterUserDto),
  handler
);

// ❌ Bad
app.post('/users', handler); // No validation
```

### 2. Combine Validation with Sanitization

```typescript
// ✅ Good - includes sanitization
...ValidationUtils.validateRequestBody(RegisterUserDto)

// ⚠️ Okay but incomplete
ClassValidationMiddleware.validateBody(RegisterUserDto)
```

### 3. Use Appropriate Error Handling

```typescript
// ✅ Good
app.use(ErrorHandler.handle);

// ❌ Bad - no error handling
```

### 4. Validate All Input Sources

```typescript
// Validate body, params, and query as needed
app.put(
  '/topics/:id',
  ...ValidationUtils.validateIdAndBody(UpdateTopicDto),
  ClassValidationMiddleware.validateQuery(HierarchyQueryDto),
  handler
);
```

### 5. Use Type-Safe Responses

```typescript
app.post(
  '/users',
  ...ValidationUtils.validateRequestBody(RegisterUserDto),
  async (req, res) => {
    const userData: RegisterUserDto = req.body; // Type-safe
    const user = await userService.createUser(userData);
    res.json(user);
  }
);
```

## Testing Validation

```typescript
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

describe('RegisterUserDto', () => {
  it('should validate correct user data', async () => {
    const dto = plainToClass(RegisterUserDto, {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Editor',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject invalid email', async () => {
    const dto = plainToClass(RegisterUserDto, {
      name: 'John Doe',
      email: 'invalid-email',
      role: 'Editor',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });
});
```

## Migration from Legacy Validation

If you're migrating from the legacy ValidationMiddleware:

```typescript
// Old way
ValidationMiddleware.validateRequiredFields(['name', 'email'])

// New way
...ValidationUtils.validateRequestBody(RegisterUserDto)
```

The new system provides better type safety, more comprehensive validation, and automatic sanitization.
