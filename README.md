# Dynamic Knowledge Base API

A RESTful API for managing interconnected topics and resources with version control, hierarchical organization, user roles, and path finding algorithms.

## Features

- 🏗️ **Clean Architecture**: Layered architecture with clear separation of concerns
- 🔄 **Version Control**: Topic versioning with Factory pattern implementation
- 🌳 **Hierarchical Structure**: Parent-child topic relationships with Composite pattern
- 👥 **User Roles**: Admin, Editor, and Viewer roles with Strategy pattern permissions
- 🔍 **Path Finding**: Custom shortest path algorithm between topics using BFS
- 📚 **Resource Management**: Associate external resources with topics
- 🛡️ **Security**: JWT authentication, bcrypt password hashing, input validation, and role-based access control
- 🧪 **Testing**: Comprehensive test coverage with 510+ passing unit tests

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
   # Edit .env file and configure:
   # - JWT_ACCESS_SECRET: Secret key for JWT access tokens
   # - JWT_REFRESH_SECRET: Secret key for JWT refresh tokens  
   # - JWT_ACCESS_EXPIRY: Access token expiration (e.g., '1h')
   # - JWT_REFRESH_EXPIRY: Refresh token expiration (e.g., '7d')
   ```

4. **Initialize database**

   ```bash
   npm run db:init
   ```

5. **Set up admin user**

   ```bash
   npm run db:set-admin-password
   ```
   
   This creates the default admin user:
   - **Email**: `admin@example.com`
   - **Role**: `Admin`
   - **Password**: (you'll set this during the script)

6. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

### Available Scripts

| Script                       | Description                              |
| ---------------------------- | ---------------------------------------- |
| `npm run dev`                | Start development server with hot reload |
| `npm run build`              | Build for production                     |
| `npm start`                  | Start production server                  |
| `npm test`                   | Run all tests                            |
| `npm run test:watch`         | Run tests in watch mode                  |
| `npm run test:coverage`      | Run tests with coverage report           |
| `npm run lint`               | Run ESLint                               |
| `npm run lint:fix`           | Fix ESLint issues automatically          |
| `npm run format`             | Format code with Prettier                |
| `npm run db:init`            | Initialize database with default admin   |
| `npm run db:seed`            | Seed database with test data             |
| `npm run db:reset`           | Reset database to initial state          |
| `npm run db:set-admin-password` | Set password for default admin user     |

## API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Health Check

```http
GET /health
```

### Authentication

> **⚠️ Important**: After running `npm run db:init`, you must set up the admin password using `npm run db:set-admin-password` before you can create users with elevated roles.

#### Admin Login (First Step)

```http
POST /api/v1/users/login
```

```json
{
  "email": "admin@example.com",
  "password": "your-admin-password"
}
```

#### Register User (Public Registration - Viewer Role Only)

```http
POST /api/v1/users/register
```

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "Viewer",
  "password": "securepassword123"
}
```

> **Note**: Public registration automatically assigns `Viewer` role. Only authenticated admins can create `Editor` or `Admin` users.

#### Register User with Elevated Role (Admin Only)

```http
POST /api/v1/users/register
Authorization: Bearer <admin-jwt-token>
```

```json
{
  "name": "Jane Editor",
  "email": "jane@example.com",
  "role": "Editor",
  "password": "securepassword123"
}
```

#### Login User

```http
POST /api/v1/users/login
```

```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_001",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "Editor",
      "isAdmin": false,
      "canEdit": true,
      "isViewerOnly": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

### User Management

#### Get Users

```http
GET /api/v1/users?search=john&role=Editor
Authorization: Bearer <jwt-token>
```

#### Get User by ID

```http
GET /api/v1/users/:id
Authorization: Bearer <jwt-token>
```

#### Update User

```http
PUT /api/v1/users/:id
Authorization: Bearer <jwt-token>
```

```json
{
  "name": "John Smith",
  "email": "john.smith@example.com"
}
```

#### Delete User (Admin only)

```http
DELETE /api/v1/users/:id
Authorization: Bearer <admin-jwt-token>
```

### Topic Management

#### Create Topic (Admin/Editor only)

```http
POST /api/v1/topics
Authorization: Bearer <jwt-token>
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
Authorization: Bearer <jwt-token> (optional for read operations)
```

#### Get All Topics

```http
GET /api/v1/topics
Authorization: Bearer <jwt-token> (optional for read operations)
```

#### Update Topic (Admin/Editor only)

```http
PUT /api/v1/topics/:id
Authorization: Bearer <jwt-token>
```

#### Delete Topic (Admin only)

```http
DELETE /api/v1/topics/:id
Authorization: Bearer <admin-jwt-token>
```

#### Get Topic Hierarchy

```http
GET /api/v1/topics/:id/hierarchy?maxDepth=5
Authorization: Bearer <jwt-token> (optional for read operations)
```

### Resource Management

#### Create Resource (Admin/Editor only)

```http
POST /api/v1/resources
Authorization: Bearer <jwt-token>
```

```json
{
  "topicId": "topic_001",
  "name": "ML Guide",
  "url": "https://example.com/article",
  "description": "Comprehensive guide to machine learning",
  "type": "article"
}
```

#### Get Resources

```http
GET /api/v1/resources?search=guide&type=article
Authorization: Bearer <jwt-token> (optional for read operations)
```

#### Get Resource by ID

```http
GET /api/v1/resources/:id
Authorization: Bearer <jwt-token> (optional for read operations)
```

#### Update Resource (Admin/Editor only)

```http
PUT /api/v1/resources/:id
Authorization: Bearer <jwt-token>
```

#### Delete Resource (Admin only)

```http
DELETE /api/v1/resources/:id
Authorization: Bearer <admin-jwt-token>
```

### Path Finding

#### Find Shortest Path Between Topics

```http
GET /api/v1/topics/:startTopicId/path/:endTopicId
Authorization: Bearer <jwt-token>
```

**Example:**
```bash
curl --request GET \
  --url 'http://localhost:3000/api/v1/topics/5c35486e-6c1c-4d47-b507-c44e55867e04/path/a2879fd5-9c42-4d04-ba8d-0dd8283f9a8b' \
  --header 'Authorization: Bearer <jwt-token>'
```

**Response:**
```json
{
  "status": "success",
  "message": "Shortest path found successfully",
  "data": {
    "startTopicId": "5c35486e-6c1c-4d47-b507-c44e55867e04",
    "endTopicId": "a2879fd5-9c42-4d04-ba8d-0dd8283f9a8b",
    "path": [
      {
        "id": "5c35486e-6c1c-4d47-b507-c44e55867e04",
        "name": "Machine Learning Basics",
        "content": "Introduction to machine learning concepts and algorithms",
        "version": 1
      }
    ],
    "pathLength": 4,
    "distance": 3,
    "connected": true
  }
}
```

#### Check Topic Connections

```http
GET /api/v1/topics/:topicId/connections?targetId=topic_002
Authorization: Bearer <jwt-token>
```

#### Find Nearby Topics

```http
GET /api/v1/topics/:topicId/nearby?distance=2
Authorization: Bearer <jwt-token>
```

#### Validate Path Request (Admin/Editor only)

```http
POST /api/v1/path/validate
Authorization: Bearer <jwt-token>
```

```json
{
  "startTopicId": "topic_001",
  "endTopicId": "topic_002"
}
```

#### Get Path Statistics (Admin only)

```http
GET /api/v1/path/stats
Authorization: Bearer <admin-jwt-token>
```

#### Clear Path Cache (Admin only)

```http
POST /api/v1/path/clear-cache
Authorization: Bearer <admin-jwt-token>
```

## Architecture

The project follows Clean Architecture principles with the following structure:

```
src/
├── domain/              # Business entities and interfaces
│   ├── entities/        # Domain entities (User, Topic, Resource)
│   ├── enums/          # Domain enumerations
│   ├── strategies/     # Permission strategies
│   ├── factories/      # Factory pattern implementations
│   ├── utils/          # Domain utilities
│   └── repositories/   # Repository interfaces
├── application/         # Business logic layer
│   ├── services/        # Business services
│   ├── dtos/           # Data Transfer Objects
│   └── errors/         # Custom error classes
├── infrastructure/      # External concerns
│   ├── server/         # Express server setup
│   ├── middleware/     # Authentication, validation middleware
│   ├── repositories/   # Repository implementations
│   ├── database/       # JSON file database
│   ├── controllers/    # HTTP controllers
│   ├── routes/         # Route definitions
│   └── services/       # Infrastructure services (JWT)
└── test/               # Test utilities and setup
    ├── utils/          # Test utilities (JwtTestUtils, TestServer)
    └── performance/    # Performance tests
```

## Development

### Running Tests

```bash
npm test                 # Run all tests (510+ passing tests)
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
npm run db:init                 # Initialize database with default admin
npm run db:set-admin-password   # Set password for admin@example.com
npm run db:seed                 # Add sample data
npm run db:reset                # Reset database
npm run db:backup               # Create backup
npm run db:validate             # Validate database integrity
```

### Initial Setup Workflow

1. **Initialize database**: `npm run db:init`
2. **Set admin password**: `npm run db:set-admin-password`
3. **Add sample data** (optional): `npm run db:seed`
4. **Login as admin**: Use `admin@example.com` with your password
5. **Create other users**: Use admin JWT to create Editor/Admin users

## Technologies Used

- **TypeScript** for type safety
- **Express.js** for HTTP server
- **JWT (jsonwebtoken)** for authentication
- **bcrypt** for password hashing
- **class-validator** for DTO validation
- **class-transformer** for data transformation
- **Jest** for testing
- **ESLint + Prettier** for code quality
- **JSON file-based database** for simplicity
- **Clean Architecture** with SOLID principles
- **Design Patterns**: Factory, Strategy, Composite, Repository

## Security Features

- **JWT Authentication**: Stateless authentication with access and refresh tokens
- **Password Security**: bcrypt hashing with salt rounds (max 72 characters)
- **Role-Based Access Control**: Admin, Editor, and Viewer permissions
- **Input Validation**: DTO validation with class-validator
- **Authorization Middleware**: JWT token verification and user validation

## Contributing

1. Follow the existing code style and patterns
2. Write tests for new functionality
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

MIT
