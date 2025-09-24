# Dynamic Knowledge Base API

A RESTful API for managing interconnected topics and resources with advanced features including version control, hierarchical organization, user roles, and permissions.

## Features

- 🏗️ **Clean Architecture**: Layered architecture with clear separation of concerns
- 🔄 **Version Control**: Topic versioning with Factory pattern implementation
- 🌳 **Hierarchical Structure**: Parent-child topic relationships with Composite pattern
- 👥 **User Roles**: Admin, Editor, and Viewer roles with Strategy pattern permissions
- 🔍 **Path Finding**: Custom shortest path algorithm between topics
- 📚 **Resource Management**: Associate external resources with topics
- 🛡️ **Error Handling**: Comprehensive error handling and validation
- 🧪 **Testing**: Full test coverage with unit and integration tests

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier

## API Endpoints

### Health Check
- `GET /health` - System health status

### API Base
- `GET /api/v1` - API information and available endpoints

*Note: Topic, Resource, and User endpoints will be implemented in subsequent development phases.*

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

This project uses:
- **TypeScript** for type safety
- **Express.js** for HTTP server
- **Jest** for testing
- **ESLint + Prettier** for code quality
- **JSON file-based database** for simplicity

## Contributing

1. Follow the existing code style and patterns
2. Write tests for new functionality
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

MIT