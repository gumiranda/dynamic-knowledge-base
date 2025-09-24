# Dynamic Knowledge Base API

A RESTful API for managing interconnected topics and resources with version control, hierarchical organization, user roles, and path finding algorithms.

## Features

- 🏗️ **Clean Architecture**: Layered architecture with clear separation of concerns
- 🔄 **Version Control**: Topic versioning with Factory pattern implementation
- 🌳 **Hierarchical Structure**: Parent-child topic relationships with Composite pattern
- 👥 **User Roles**: Admin, Editor, and Viewer roles with Strategy pattern permissions
- 🔍 **Path Finding**: Custom shortest path algorithm between topics using BFS
- 📚 **Resource Management**: Associate external resources with topics
- 🛡️ **Security**: Input validation, sanitization, and role-based access control
- 🧪 **Testing**: Comprehensive test coverage with unit and integration tests

## Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd dynamic-knowledge-base
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment**

   ```bash
   cp .env.example .env
   ```

4. **Initialize database**

   ```bash
   npm run db:init
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

### Available Scripts

| Script                  | Description                              |
| ----------------------- | ---------------------------------------- |
| `npm run dev`           | Start development server with hot reload |
| `npm run build`         | Build for production                     |
| `npm start`             | Start production server                  |
| `npm test`              | Run all tests                            |
| `npm run test:watch`    | Run tests in watch mode                  |
| `npm run test:coverage` | Run tests with coverage report           |
| `npm run lint`          | Run ESLint                               |
| `npm run lint:fix`      | Fix ESLint issues automatically          |
| `npm run format`        | Format code with Prettier                |
| `npm run db:init`       | Initialize database with sample data     |
| `npm run db:seed`       | Seed database with test data             |
| `npm run db:reset`      | Reset database to initial state          |

## API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Health Check

```http
GET /health
```

### User Management

#### Register User

```http
POST /api/v1/users
```

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "Editor"
}
```

#### Authenticate User

```http
POST /api/v1/users/authenticate
```

```json
{
  "email": "john@example.com"
}
```

#### Get Users

```http
GET /api/v1/users?search=john&role=Editor
```

### Topic Management

#### Create Topic

```http
POST /api/v1/topics
```

```json
{
  "name": "Machine Learning Basics",
  "content": "Introduction to machine learning concepts and algorithms",
  "parentTopicId": "topic_001"
}
```

#### Get Topic

```http
GET /api/v1/topics/:id?version=2
```

#### Update Topic

```http
PUT /api/v1/topics/:id
```

#### Delete Topic

```http
DELETE /api/v1/topics/:id
```

#### Get Topic Hierarchy

```http
GET /api/v1/topics/:id/hierarchy?maxDepth=5
```

### Resource Management

#### Create Resource

```http
POST /api/v1/resources
```

```json
{
  "topicId": "topic_001",
  "url": "https://example.com/article",
  "description": "Comprehensive guide to machine learning",
  "type": "article"
}
```

#### Get Resources

```http
GET /api/v1/resources?search=guide&type=article
```

### Path Finding

#### Find Shortest Path

```http
GET /api/v1/topics/:startId/path/:endId
```

#### Find Nearby Topics

```http
GET /api/v1/topics/:topicId/nearby?distance=3
```

## Architecture

The project follows Clean Architecture principles with the following structure:

```
src/
├── domain/              # Business entities and interfaces
│   ├── entities/        # Domain entities
│   ├── interfaces/      # Domain interfaces
│   └── repositories/    # Repository interfaces
├── application/         # Business logic layer
│   ├── services/        # Business services
│   └── dtos/           # Data Transfer Objects
├── infrastructure/      # External concerns
│   ├── server/         # Express server setup
│   ├── middleware/     # Custom middleware
│   ├── repositories/   # Repository implementations
│   ├── database/       # Database layer
│   └── config/         # Configuration
└── test/               # Test utilities and setup
```

## Development

### Running Tests

```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
```

### Code Quality

```bash
npm run lint             # Check code style
npm run lint:fix         # Fix code style issues
npm run format           # Format code with Prettier
```

### Database Management

```bash
npm run db:init          # Initialize database
npm run db:seed          # Add sample data
npm run db:reset         # Reset database
npm run db:backup        # Create backup
npm run db:validate      # Validate database integrity
```

## Technologies Used

- **TypeScript** for type safety
- **Express.js** for HTTP server
- **Jest** for testing
- **ESLint + Prettier** for code quality
- **JSON file-based database** for simplicity
- **Clean Architecture** with SOLID principles
- **Design Patterns**: Factory, Strategy, Composite, Repository

## Contributing

1. Follow the existing code style and patterns
2. Write tests for new functionality
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

MIT
