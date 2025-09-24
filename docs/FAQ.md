# Frequently Asked Questions (FAQ)

This document answers common questions about the Dynamic Knowledge Base API.

## Table of Contents

- [General Questions](#general-questions)
- [Getting Started](#getting-started)
- [API Usage](#api-usage)
- [Authentication & Authorization](#authentication--authorization)
- [Topic Management](#topic-management)
- [Version Control](#version-control)
- [Path Finding](#path-finding)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Deployment](#deployment)

## General Questions

### What is the Dynamic Knowledge Base API?

The Dynamic Knowledge Base API is a RESTful service for managing interconnected topics and resources with advanced features including:

- Version control for topics
- Hierarchical topic organization
- User role management
- Shortest path finding between topics
- Resource association and management

### What technologies does it use?

- **Backend**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: JSON file-based storage (easily migrated to SQL/NoSQL)
- **Testing**: Jest with comprehensive test coverage
- **Architecture**: Clean Architecture with SOLID principles
- **Patterns**: Factory, Strategy, Composite, Repository patterns

### Is it production-ready?

Yes, the API includes:

- Comprehensive error handling
- Input validation and sanitization
- Security best practices
- Monitoring and logging
- Full test coverage
- Performance optimizations

However, for high-scale production use, consider migrating from JSON file storage to a proper database.

### What are the system requirements?

- **Node.js**: v18 or higher
- **Memory**: Minimum 512MB RAM (2GB+ recommended for production)
- **Storage**: 100MB+ free space
- **OS**: Linux, macOS, or Windows

## Getting Started

### How do I install and run the API?

```bash
# Clone the repository
git clone <repository-url>
cd dynamic-knowledge-base

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Initialize database
npm run db:init

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000`

### How do I create my first user?

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "Admin"
  }'
```

### What's the difference between development and production mode?

| Feature         | Development | Production   |
| --------------- | ----------- | ------------ |
| Hot reload      | ✅ Yes      | ❌ No        |
| Detailed errors | ✅ Yes      | ❌ Limited   |
| Debug logging   | ✅ Verbose  | ❌ Minimal   |
| Performance     | ❌ Slower   | ✅ Optimized |
| Security        | ❌ Relaxed  | ✅ Strict    |

### How do I switch to production mode?

```bash
# Build the application
npm run build

# Set environment
export NODE_ENV=production

# Start production server
npm start
```

## API Usage

### What's the base URL for API endpoints?

```
http://localhost:3000/api/v1
```

### What format do API responses use?

All responses follow this consistent format:

```json
{
  "status": "success" | "error" | "validation_error",
  "message": "Human readable message",
  "data": {
    // Response data
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### How do I handle pagination?

Currently, the API doesn't implement pagination but returns reasonable limits:

- Topics: Returns all matching results
- Resources: Limited to 100 results by default
- Users: Returns all users (admin only)

Future versions will include proper pagination with `limit`, `offset`, and `totalCount`.

### What HTTP status codes does the API use?

| Code | Meaning               | When Used                             |
| ---- | --------------------- | ------------------------------------- |
| 200  | OK                    | Successful GET, PUT, DELETE           |
| 201  | Created               | Successful POST                       |
| 400  | Bad Request           | Validation errors, malformed requests |
| 401  | Unauthorized          | Authentication required               |
| 403  | Forbidden             | Insufficient permissions              |
| 404  | Not Found             | Resource doesn't exist                |
| 409  | Conflict              | Duplicate data, constraint violations |
| 500  | Internal Server Error | Application errors                    |

### How do I test the API?

Use the health check endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

## Authentication & Authorization

### How does authentication work?

The API uses a simplified authentication system:

1. Create/authenticate users via the `/users` endpoints
2. Include user information in subsequent requests
3. The system validates permissions based on user roles

### What are the different user roles?

| Role       | Permissions                                           |
| ---------- | ----------------------------------------------------- |
| **Admin**  | Full access: create, read, update, delete everything  |
| **Editor** | Create, read, update topics and resources (no delete) |
| **Viewer** | Read-only access to topics and resources              |

### How do I authenticate a user?

```bash
curl -X POST http://localhost:3000/api/v1/users/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### Can I change a user's role?

Yes, admins can assign roles:

```bash
curl -X POST http://localhost:3000/api/v1/users/USER_ID/assign-role \
  -H "Content-Type: application/json" \
  -d '{"newRole": "Editor"}'
```

### How do I check user permissions?

```bash
curl -X POST http://localhost:3000/api/v1/users/validate-permissions \
  -H "Content-Type: application/json" \
  -d '{
    "action": "write",
    "resource": "topic"
  }'
```

## Topic Management

### How do I create a topic?

```bash
curl -X POST http://localhost:3000/api/v1/topics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Machine Learning",
    "content": "Introduction to ML concepts",
    "parentTopicId": "parent_topic_id"
  }'
```

### Can topics have multiple parents?

No, each topic can have only one parent, creating a tree structure. This prevents circular references and maintains hierarchy integrity.

### How deep can the topic hierarchy go?

There's no hard limit, but for performance reasons:

- Hierarchy retrieval is limited to 20 levels by default
- Path finding works efficiently up to 10 levels
- Consider flattening very deep hierarchies

### How do I search for topics?

```bash
# Search by name or content
curl "http://localhost:3000/api/v1/topics?search=machine+learning"

# Get child topics
curl "http://localhost:3000/api/v1/topics?parentId=PARENT_ID"

# Get root topics only
curl "http://localhost:3000/api/v1/topics?rootOnly=true"
```

### What happens when I delete a topic?

Topics are soft-deleted:

- The topic is marked as deleted but not removed
- Child topics become orphaned
- Version history is preserved
- Admins can restore deleted topics

### How do I handle orphaned topics?

```bash
# Find orphaned topics
curl http://localhost:3000/api/v1/topics/orphaned

# Assign new parent
curl -X PUT http://localhost:3000/api/v1/topics/TOPIC_ID \
  -H "Content-Type: application/json" \
  -d '{"parentTopicId": "NEW_PARENT_ID"}'
```

## Version Control

### How does topic versioning work?

- Each topic update creates a new version
- Previous versions are preserved
- Version numbers increment automatically
- You can retrieve any specific version

### How do I get a specific version?

```bash
# Get latest version (default)
curl http://localhost:3000/api/v1/topics/TOPIC_ID

# Get specific version
curl http://localhost:3000/api/v1/topics/TOPIC_ID?version=2
```

### How do I see all versions of a topic?

```bash
curl http://localhost:3000/api/v1/topics/TOPIC_ID/versions
```

### Can I delete old versions?

Currently, all versions are preserved. Future versions may include:

- Version cleanup policies
- Archival of old versions
- Configurable retention periods

### How much storage do versions use?

Each version stores the complete topic data. For a topic with:

- 1KB content
- 10 versions
- Total storage: ~10KB

Consider the storage impact for topics with large content and many versions.

## Path Finding

### How does the shortest path algorithm work?

The API uses a custom Breadth-First Search (BFS) algorithm:

- **Time Complexity**: O(V + E) where V = vertices, E = edges
- **Space Complexity**: O(V)
- **Features**: Bidirectional traversal, cycle detection, caching

### How do I find the path between two topics?

```bash
curl http://localhost:3000/api/v1/topics/START_ID/path/END_ID
```

### What if no path exists?

The API returns:

```json
{
  "status": "success",
  "message": "No path found between the specified topics",
  "data": {
    "connected": false,
    "distance": -1,
    "path": []
  }
}
```

### How do I find topics near a specific topic?

```bash
# Find topics within 3 hops
curl "http://localhost:3000/api/v1/topics/TOPIC_ID/nearby?distance=3"
```

### Does path finding use caching?

Yes, the system caches:

- Frequently requested paths
- Graph connectivity information
- Topic relationships

Cache can be cleared by admins:

```bash
curl -X POST http://localhost:3000/api/v1/path/clear-cache
```

### How do I check path finding performance?

```bash
# Get cache statistics (admin only)
curl http://localhost:3000/api/v1/path/stats
```

## Performance

### How fast is the API?

Typical response times:

- Simple CRUD operations: < 50ms
- Path finding: < 200ms for most cases
- Hierarchy retrieval: < 100ms for moderate depth
- Search operations: < 150ms

### What affects performance?

1. **Database size**: Larger datasets slow operations
2. **Hierarchy depth**: Deep hierarchies affect traversal
3. **Path complexity**: Long paths take more time
4. **Cache state**: Cold cache requires computation

### How can I improve performance?

1. **Use caching**: Path finding results are cached
2. **Limit hierarchy depth**: Use `maxDepth` parameter
3. **Optimize queries**: Use specific filters
4. **Regular maintenance**: Clear caches periodically

### When should I consider database migration?

Consider migrating from JSON files when:

- Database file > 100MB
- > 10,000 topics
- > 100 concurrent users
- Response times > 1 second

### What databases are recommended for migration?

- **PostgreSQL**: Best for complex queries and relationships
- **MongoDB**: Good for document-based storage
- **Redis**: Excellent for caching layer
- **Elasticsearch**: Great for search functionality

## Troubleshooting

### The API won't start. What should I check?

1. **Port availability**: `lsof -i :3000`
2. **Dependencies**: `npm install`
3. **Database file**: Check `data/database.json` exists
4. **Permissions**: Ensure read/write access to data directory
5. **Node version**: `node --version` (should be v18+)

### I'm getting validation errors. How do I fix them?

Check the error response for specific field issues:

```json
{
  "status": "validation_error",
  "details": {
    "fieldErrors": [
      {
        "field": "email",
        "messages": ["Email must be a valid email address"]
      }
    ]
  }
}
```

Fix the indicated fields and retry.

### Path finding is slow. What can I do?

1. **Check cache stats**: `GET /api/v1/path/stats`
2. **Clear cache**: `POST /api/v1/path/clear-cache`
3. **Reduce graph complexity**: Simplify topic hierarchy
4. **Limit search distance**: Use smaller distance values

### The database file is corrupted. How do I recover?

1. **Stop the application**
2. **Backup corrupted file**: `cp data/database.json data/database.json.backup`
3. **Restore from backup**: `cp data/database.json.backup data/database.json`
4. **If no backup**: `npm run db:reset` (loses data)
5. **Restart application**

### How do I enable debug logging?

```bash
# Development
DEBUG=app:* npm run dev

# Production (errors only)
DEBUG=app:error npm start
```

## Development

### How do I set up the development environment?

```bash
# Install dependencies
npm install

# Set up pre-commit hooks
npm run prepare

# Start development server
npm run dev
```

### How do I run tests?

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### How do I add a new endpoint?

1. **Create DTO** in `src/application/dtos/`
2. **Add service method** in appropriate service
3. **Create controller method** in appropriate controller
4. **Add route** in `src/infrastructure/routes/`
5. **Write tests** for the new functionality

### What's the code style?

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with Prettier
- **Naming**: camelCase for variables, PascalCase for classes
- **Imports**: Absolute imports preferred
- **Comments**: JSDoc for public methods

### How do I add a new design pattern?

Follow the existing patterns:

1. **Factory**: For object creation (see `TopicVersionFactory`)
2. **Strategy**: For algorithms (see permission strategies)
3. **Repository**: For data access (see repository implementations)
4. **Composite**: For hierarchical structures (see `Topic` entity)

## Deployment

### How do I deploy to production?

```bash
# Build the application
npm run build

# Set environment variables
export NODE_ENV=production
export PORT=3000

# Start production server
npm start
```

### Should I use a process manager?

Yes, use PM2 for production:

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Auto-restart on reboot
pm2 startup
pm2 save
```

### How do I set up SSL/HTTPS?

Use a reverse proxy like nginx:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### How do I handle database backups?

```bash
# Manual backup
cp data/database.json backups/database-$(date +%Y%m%d).json

# Automated backup (cron job)
0 2 * * * /path/to/backup-script.sh
```

### What monitoring should I set up?

1. **Health checks**: Monitor `/health` endpoint
2. **Response times**: Track API performance
3. **Error rates**: Monitor error logs
4. **Resource usage**: CPU, memory, disk
5. **Database size**: Monitor growth

### How do I scale the application?

1. **Horizontal scaling**: Use PM2 cluster mode
2. **Load balancing**: nginx or cloud load balancer
3. **Database scaling**: Migrate to proper database
4. **Caching**: Add Redis for distributed caching
5. **CDN**: For static assets

---

## Still Have Questions?

### Documentation

- [API Documentation](../README.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Validation Guide](./VALIDATION_GUIDE.md)

### Support Channels

- **GitHub Issues**: Bug reports and feature requests
- **Email**: support@example.com
- **Community**: Join our Discord/Slack community

### Contributing

- Read the [Contributing Guide](../CONTRIBUTING.md)
- Check [open issues](https://github.com/example/repo/issues)
- Submit pull requests with improvements

---

_This FAQ is regularly updated. Last updated: January 2024_
