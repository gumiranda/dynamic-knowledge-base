# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Dynamic Knowledge Base API.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Common Issues](#common-issues)
- [Error Messages](#error-messages)
- [Performance Issues](#performance-issues)
- [Database Issues](#database-issues)
- [Development Issues](#development-issues)
- [Production Issues](#production-issues)
- [Debugging Tools](#debugging-tools)

## Quick Diagnostics

### Health Check

First, check if the API is running properly:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "memory": {
    "used": "45.2 MB",
    "total": "128 MB"
  }
}
```

### System Information

Check system requirements:

```bash
node --version    # Should be v18 or higher
npm --version     # Should be v8 or higher
```

### Log Files

Check application logs:

```bash
# Development logs
tail -f logs/development.log

# Production logs
tail -f logs/production.log

# Error logs
tail -f logs/error.log
```

## Common Issues

### 1. Server Won't Start

#### Issue: Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

#### Issue: Missing Dependencies

```
Error: Cannot find module 'express'
```

**Solution:**

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Or install specific dependency
npm install express
```

#### Issue: TypeScript Compilation Errors

```
error TS2307: Cannot find module './types'
```

**Solution:**

```bash
# Clean build
npm run build

# Check TypeScript configuration
npx tsc --noEmit

# Install type definitions
npm install @types/node @types/express
```

### 2. Database Connection Issues

#### Issue: Database File Not Found

```
Error: ENOENT: no such file or directory, open 'data/database.json'
```

**Solution:**

```bash
# Create data directory
mkdir -p data

# Initialize database
npm run db:init

# Check file permissions
ls -la data/database.json
chmod 644 data/database.json
```

#### Issue: Database Corruption

```
Error: Unexpected token in JSON at position 0
```

**Solution:**

```bash
# Backup current database
cp data/database.json data/database.json.backup

# Reset database
npm run db:reset

# Or restore from backup
cp data/database.json.backup data/database.json
```

#### Issue: Permission Denied

```
Error: EACCES: permission denied, open 'data/database.json'
```

**Solution:**

```bash
# Fix file permissions
chmod 644 data/database.json
chown $USER:$USER data/database.json

# Fix directory permissions
chmod 755 data/
```

### 3. Authentication Issues

#### Issue: User Not Found

```json
{
  "status": "error",
  "message": "User not found"
}
```

**Solution:**

1. Check if user exists in database
2. Verify email format
3. Create user if needed:

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","role":"Editor"}'
```

#### Issue: Insufficient Permissions

```json
{
  "status": "error",
  "message": "Insufficient permissions"
}
```

**Solution:**

1. Check user role in database
2. Verify permission requirements for endpoint
3. Update user role if needed:

```bash
curl -X POST http://localhost:3000/api/v1/users/USER_ID/assign-role \
  -H "Content-Type: application/json" \
  -d '{"newRole":"Admin"}'
```

### 4. Validation Errors

#### Issue: Invalid Input Data

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
      }
    ]
  }
}
```

**Solution:**

1. Check field requirements in API documentation
2. Validate input format
3. Use proper data types

#### Issue: Missing Required Fields

```json
{
  "status": "validation_error",
  "message": "Name is required"
}
```

**Solution:**
Ensure all required fields are included in request body:

```json
{
  "name": "Required field",
  "email": "user@example.com",
  "role": "Editor"
}
```

### 5. Path Finding Issues

#### Issue: No Path Found

```json
{
  "status": "success",
  "message": "No path found between the specified topics",
  "data": {
    "connected": false,
    "distance": -1
  }
}
```

**Solution:**

1. Verify both topics exist
2. Check if topics are in connected components
3. Create connecting topics if needed

#### Issue: Path Finding Timeout

```
Error: Path finding operation timed out
```

**Solution:**

1. Clear path finding cache:

```bash
curl -X POST http://localhost:3000/api/v1/path/clear-cache
```

2. Check graph connectivity:

```bash
curl http://localhost:3000/api/v1/path/stats
```

3. Optimize topic hierarchy structure

## Error Messages

### HTTP Status Codes

| Code | Meaning               | Common Causes                         |
| ---- | --------------------- | ------------------------------------- |
| 400  | Bad Request           | Invalid input data, validation errors |
| 401  | Unauthorized          | Missing or invalid authentication     |
| 403  | Forbidden             | Insufficient permissions              |
| 404  | Not Found             | Resource doesn't exist                |
| 409  | Conflict              | Duplicate data, constraint violations |
| 422  | Unprocessable Entity  | Valid format but invalid data         |
| 500  | Internal Server Error | Application bugs, database issues     |

### Application Error Codes

| Error Code           | Description               | Solution                    |
| -------------------- | ------------------------- | --------------------------- |
| `USER_NOT_FOUND`     | User doesn't exist        | Create user or check ID     |
| `TOPIC_NOT_FOUND`    | Topic doesn't exist       | Create topic or check ID    |
| `RESOURCE_NOT_FOUND` | Resource doesn't exist    | Create resource or check ID |
| `CIRCULAR_REFERENCE` | Topic hierarchy cycle     | Remove circular dependency  |
| `INVALID_VERSION`    | Version number invalid    | Use valid version number    |
| `PERMISSION_DENIED`  | Insufficient permissions  | Check user role             |
| `VALIDATION_FAILED`  | Input validation failed   | Fix input data              |
| `DATABASE_ERROR`     | Database operation failed | Check database status       |

### Validation Error Details

Common validation errors and solutions:

#### Email Validation

```json
{
  "field": "email",
  "messages": ["Email must be a valid email address"],
  "value": "invalid-email"
}
```

**Solution:** Use valid email format: `user@domain.com`

#### URL Validation

```json
{
  "field": "url",
  "messages": ["URL must be a valid URL"],
  "value": "not-a-url"
}
```

**Solution:** Use valid URL format: `https://example.com`

#### Role Validation

```json
{
  "field": "role",
  "messages": ["Role must be one of: Admin, Editor, Viewer"],
  "value": "InvalidRole"
}
```

**Solution:** Use valid role: `Admin`, `Editor`, or `Viewer`

## Performance Issues

### 1. Slow Response Times

#### Symptoms

- API responses taking > 2 seconds
- High CPU usage
- Memory consumption growing

#### Diagnosis

```bash
# Check system resources
top
htop

# Monitor API performance
curl -w "@curl-format.txt" http://localhost:3000/api/v1/topics

# Check path finding cache stats
curl http://localhost:3000/api/v1/path/stats
```

#### Solutions

1. **Clear caches:**

```bash
curl -X POST http://localhost:3000/api/v1/path/clear-cache
```

2. **Optimize database:**

```bash
npm run db:optimize
```

3. **Increase memory limit:**

```bash
node --max-old-space-size=4096 dist/index.js
```

### 2. Memory Leaks

#### Symptoms

- Memory usage continuously increasing
- Application crashes with out-of-memory errors
- Slow garbage collection

#### Diagnosis

```bash
# Monitor memory usage
node --inspect dist/index.js

# Use Chrome DevTools for memory profiling
# Navigate to chrome://inspect
```

#### Solutions

1. **Restart application regularly**
2. **Implement proper cleanup in event handlers**
3. **Use memory profiling tools**
4. **Optimize large object handling**

### 3. Database Performance

#### Symptoms

- Slow database operations
- File I/O errors
- Database lock timeouts

#### Diagnosis

```bash
# Check database file size
ls -lh data/database.json

# Monitor file I/O
iostat -x 1

# Check disk space
df -h
```

#### Solutions

1. **Archive old data:**

```bash
npm run db:archive
```

2. **Optimize database structure:**

```bash
npm run db:optimize
```

3. **Increase disk space**
4. **Consider database migration to PostgreSQL/MongoDB**

## Database Issues

### 1. Data Corruption

#### Symptoms

- JSON parsing errors
- Inconsistent data
- Missing records

#### Recovery Steps

1. **Stop the application**
2. **Backup current database:**

```bash
cp data/database.json data/database.json.corrupted
```

3. **Restore from backup:**

```bash
cp data/database.json.backup data/database.json
```

4. **If no backup exists, try to repair:**

```bash
npm run db:repair
```

### 2. Version Conflicts

#### Symptoms

- Version mismatch errors
- Duplicate version numbers
- Missing versions

#### Solutions

1. **Check version integrity:**

```bash
npm run db:check-versions
```

2. **Rebuild version index:**

```bash
npm run db:rebuild-versions
```

3. **Manual version cleanup:**

```bash
npm run db:clean-versions
```

### 3. Orphaned Records

#### Symptoms

- References to non-existent records
- Broken relationships
- Inconsistent hierarchy

#### Solutions

1. **Find orphaned records:**

```bash
npm run db:find-orphans
```

2. **Clean orphaned records:**

```bash
npm run db:clean-orphans
```

3. **Rebuild relationships:**

```bash
npm run db:rebuild-relationships
```

## Development Issues

### 1. Test Failures

#### Common Test Issues

```bash
# Run specific test
npm test -- --testNamePattern="TopicService"

# Run with verbose output
npm test -- --verbose

# Run with coverage
npm run test:coverage
```

#### Mock Issues

```typescript
// Ensure proper mock setup
jest.mock('../../infrastructure/repositories/TopicRepository');

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

### 2. TypeScript Issues

#### Type Errors

```bash
# Check TypeScript configuration
npx tsc --noEmit

# Install missing type definitions
npm install @types/package-name

# Update TypeScript
npm update typescript
```

#### Import/Export Issues

```typescript
// Use consistent import style
import { TopicService } from './TopicService';

// Avoid circular dependencies
// Use dependency injection instead
```

### 3. Hot Reload Issues

#### Development Server Not Reloading

```bash
# Restart development server
npm run dev

# Clear Node.js cache
rm -rf node_modules/.cache

# Check file watchers
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Production Issues

### 1. Application Crashes

#### Symptoms

- Process exits unexpectedly
- PM2 restarts frequently
- Out of memory errors

#### Solutions

1. **Implement proper error handling:**

```typescript
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
```

2. **Use process manager:**

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Monitor
pm2 monit
```

### 2. High Load Issues

#### Load Balancing

```bash
# Use PM2 cluster mode
pm2 start ecosystem.config.js --instances max

# Or use nginx for load balancing
```

#### Rate Limiting

```typescript
// Implement rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 3. Security Issues

#### Monitoring Security Events

```bash
# Check for suspicious activity
grep "401\|403" logs/access.log

# Monitor failed authentication attempts
grep "Authentication failed" logs/application.log
```

#### Security Headers

```typescript
// Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

## Debugging Tools

### 1. Application Debugging

#### Enable Debug Mode

```bash
# Development
DEBUG=app:* npm run dev

# Production
NODE_ENV=production DEBUG=app:error npm start
```

#### Node.js Inspector

```bash
# Start with inspector
node --inspect dist/index.js

# Debug with Chrome DevTools
# Navigate to chrome://inspect
```

### 2. Database Debugging

#### Database Inspection Tools

```bash
# Pretty print database
cat data/database.json | jq '.'

# Check specific collections
cat data/database.json | jq '.topics'

# Count records
cat data/database.json | jq '.topics | length'
```

#### Database Validation

```bash
# Validate JSON structure
npm run db:validate

# Check referential integrity
npm run db:check-integrity

# Generate database report
npm run db:report
```

### 3. Performance Debugging

#### Profiling Tools

```bash
# CPU profiling
node --prof dist/index.js

# Memory profiling
node --inspect --max-old-space-size=4096 dist/index.js
```

#### Monitoring Commands

```bash
# Monitor system resources
htop

# Monitor network connections
netstat -tulpn | grep :3000

# Monitor file descriptors
lsof -p $(pgrep node)
```

### 4. API Testing Tools

#### cURL Examples

```bash
# Test authentication
curl -X POST http://localhost:3000/api/v1/users/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test with authentication
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/v1/topics

# Test path finding
curl http://localhost:3000/api/v1/topics/topic1/path/topic2
```

#### Postman Collection

Import the provided Postman collection for comprehensive API testing:

- `docs/postman/Dynamic-Knowledge-Base.postman_collection.json`

### 5. Log Analysis

#### Log Parsing

```bash
# Filter error logs
grep "ERROR" logs/application.log

# Count error types
grep "ERROR" logs/application.log | cut -d' ' -f4 | sort | uniq -c

# Monitor real-time logs
tail -f logs/application.log | grep "ERROR"
```

#### Log Rotation

```bash
# Setup log rotation
sudo nano /etc/logrotate.d/knowledge-base

# Content:
/path/to/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 user group
}
```

## Getting Help

### 1. Documentation Resources

- [API Documentation](../README.md#api-documentation)
- [Architecture Guide](./ARCHITECTURE.md)
- [Validation Guide](./VALIDATION_GUIDE.md)

### 2. Community Support

- GitHub Issues: Report bugs and feature requests
- Stack Overflow: Tag questions with `dynamic-knowledge-base`
- Discord/Slack: Join the community chat

### 3. Professional Support

- Email: support@example.com
- Priority support for enterprise users
- Custom consulting available

### 4. Reporting Issues

When reporting issues, please include:

1. **Environment Information:**
   - Node.js version
   - Operating system
   - Application version

2. **Steps to Reproduce:**
   - Detailed steps
   - Expected behavior
   - Actual behavior

3. **Error Information:**
   - Error messages
   - Stack traces
   - Log files

4. **Additional Context:**
   - Configuration files
   - Database state
   - Network conditions

**Issue Template:**

```markdown
## Environment

- Node.js version:
- OS:
- App version:

## Steps to Reproduce

1.
2.
3.

## Expected Behavior

## Actual Behavior

## Error Messages
```

## Prevention Best Practices

### 1. Monitoring

- Set up health checks
- Monitor key metrics
- Implement alerting

### 2. Backup Strategy

- Regular database backups
- Configuration backups
- Disaster recovery plan

### 3. Testing

- Comprehensive test coverage
- Integration testing
- Performance testing

### 4. Documentation

- Keep documentation updated
- Document configuration changes
- Maintain runbooks

This troubleshooting guide should help you resolve most common issues. For complex problems, don't hesitate to reach out for support.
