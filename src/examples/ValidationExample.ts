import express from 'express';
import { ValidationUtils } from '../infrastructure/middleware/ValidationUtils';
import { RegisterUserDto, CreateTopicDto } from '../application/dtos';

/**
 * Example demonstrating how to use the new validation system
 */

const app = express();
app.use(express.json());

// Example 1: Simple body validation
app.post(
  '/users',
  ...ValidationUtils.validateRequestBody(RegisterUserDto),
  (req, res) => {
    // req.body is now a validated and transformed RegisterUserDto instance
    const user = req.body; // TypeScript knows this is RegisterUserDto
    res.json({ message: 'User created', user });
  }
);

// Example 2: ID parameter validation with body
app.put(
  '/topics/:id',
  ...ValidationUtils.validateIdAndBody(CreateTopicDto),
  (req, res) => {
    // req.params.id is validated as a proper ID format
    // req.body is validated as CreateTopicDto
    const { id } = req.params;
    const topicData = req.body;
    res.json({ message: 'Topic updated', id, topicData });
  }
);

// Example 3: Search endpoint with query validation
app.get(
  '/topics/search',
  ...ValidationUtils.validateSearchEndpoint(),
  (req, res) => {
    // req.query is validated with pagination and search parameters
    const { search, page, limit } = req.query;
    res.json({ search, page, limit });
  }
);

// Example 4: Custom validation chain
app.post(
  '/custom',
  ValidationUtils.contentType,
  ValidationUtils.sanitize,
  ValidationUtils.validateRegisterUser,
  (req, res) => {
    res.json({ message: 'Custom validation passed' });
  }
);

export { app as validationExampleApp };
