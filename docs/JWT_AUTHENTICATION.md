# JWT Authentication Documentation

This document describes the JWT (JSON Web Token) authentication system implemented in the Dynamic Knowledge Base API.

## Overview

The API uses JWT tokens for stateless authentication with role-based access control. Users authenticate with email and password to receive JWT tokens that authorize subsequent requests.

## Authentication Flow

### 1. User Registration

```http
POST /api/v1/users/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com", 
  "role": "Editor",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_001",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Editor",
    "isAdmin": false,
    "canEdit": true,
    "isViewerOnly": false
  }
}
```

### 2. User Login

```http
POST /api/v1/users/login
Content-Type: application/json

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
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzAwMSIsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSIsInJvbGUiOiJFZGl0b3IiLCJpYXQiOjE2OTQxNzIwMDAsImV4cCI6MTY5NDE3NTYwMH0.signature",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzAwMSIsImlhdCI6MTY5NDE3MjAwMCwiZXhwIjoxNjk0Nzc2ODAwfQ.signature",
    "expiresIn": 3600
  }
}
```

### 3. Making Authenticated Requests

Include the JWT token in the Authorization header:

```http
GET /api/v1/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzAwMSIsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSIsInJvbGUiOiJFZGl0b3IiLCJpYXQiOjE2OTQxNzIwMDAsImV4cCI6MTY5NDE3NTYwMH0.signature
```

## Token Structure

### Access Token Payload

```json
{
  "userId": "user_001",
  "email": "john@example.com", 
  "role": "Editor",
  "iat": 1694172000,
  "exp": 1694175600
}
```

### Refresh Token Payload

```json
{
  "userId": "user_001",
  "iat": 1694172000,
  "exp": 1694776800
}
```

## User Roles and Permissions

### Admin
- **Full access**: Can create, read, update, and delete all resources
- **User management**: Can manage other users, assign roles, delete users
- **System operations**: Full access to all endpoints

### Editor  
- **Content management**: Can create, read, and update topics and resources
- **Limited user access**: Can read users and update own profile
- **No deletion rights**: Cannot delete topics, resources, or users

### Viewer
- **Read-only access**: Can only read topics, resources, and users
- **Profile management**: Can update own profile information
- **No creation/modification**: Cannot create or modify content

## Middleware Implementation

### AuthMiddleware.authenticate
- Validates JWT tokens on protected routes
- Extracts user information from token payload
- Verifies user still exists in database
- Checks if user role hasn't changed since token issuance

### AuthMiddleware.requireAuth
- Ensures user is authenticated
- Used on routes requiring any authenticated user

### AuthMiddleware.requireRole(role)
- Requires specific role (Admin, Editor, or Viewer)
- Used for role-specific operations

### AuthMiddleware.requireAnyRole([roles])
- Requires user to have one of the specified roles
- Used for operations accessible by multiple roles

### AuthMiddleware.optionalAuth
- Attempts authentication but doesn't fail if no token
- Used for endpoints with different behavior for authenticated vs anonymous users

## Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-jwt-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-change-in-production  
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Database Configuration  
DATABASE_PATH=./data/database.json

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Token Expiration

- **Access Token**: Short-lived (default: 1 hour)
- **Refresh Token**: Long-lived (default: 7 days)

## Security Features

### Password Security
- **bcrypt hashing**: Passwords hashed with 10 salt rounds
- **Character limit**: Maximum 72 characters (bcrypt limitation)
- **Validation**: Minimum 6 characters required

### Token Security
- **Secret rotation**: Separate secrets for access and refresh tokens
- **Expiration handling**: Tokens expire and require renewal
- **Role verification**: User role checked on each request

### Input Validation
- **Email validation**: Proper email format validation
- **Password requirements**: Minimum length and string type validation
- **Role validation**: Only valid roles accepted

## Error Responses

### Authentication Errors

#### Invalid credentials
```json
{
  "status": "error",
  "message": "Invalid email or password", 
  "code": "UnauthorizedError"
}
```

#### Token expired
```json
{
  "status": "error",
  "message": "Token has expired",
  "code": "UnauthorizedError" 
}
```

#### Invalid token
```json
{
  "status": "error",
  "message": "Invalid token",
  "code": "UnauthorizedError"
}
```

#### Insufficient permissions
```json
{
  "status": "error", 
  "message": "Admin role required",
  "code": "UnauthorizedError"
}
```

### Validation Errors

#### Missing required fields
```json
{
  "status": "error",
  "message": "Email is required",
  "code": "ValidationError"
}
```

#### Invalid email format
```json
{
  "status": "error",
  "message": "Email must be a valid email address", 
  "code": "ValidationError"
}
```

#### Password too short
```json
{
  "status": "error",
  "message": "Password must be at least 6 characters long",
  "code": "ValidationError"
}
```

## Usage Examples

### Frontend Integration (JavaScript)

```javascript
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.accessToken = localStorage.getItem('accessToken');
  }

  async login(email, password) {
    const response = await fetch(`${this.baseURL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json();
      this.accessToken = data.data.accessToken;
      localStorage.setItem('accessToken', this.accessToken);
      return data;
    }
    throw new Error('Login failed');
  }

  async authenticatedRequest(endpoint, options = {}) {
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Token expired, redirect to login
      this.logout();
      window.location.href = '/login';
    }

    return response;
  }

  logout() {
    this.accessToken = null;
    localStorage.removeItem('accessToken');
  }
}
```

### cURL Examples

#### Login
```bash
curl -X POST http://localhost:3000/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

#### Create Topic (requires authentication)
```bash
curl -X POST http://localhost:3000/api/v1/topics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Machine Learning",
    "content": "Introduction to ML concepts"
  }'
```

## Best Practices

### For Developers
1. **Never log JWT tokens** in plain text
2. **Validate tokens server-side** on every protected request
3. **Use HTTPS** in production to protect tokens in transit
4. **Implement token refresh** logic for better UX
5. **Store tokens securely** on the client (avoid localStorage for sensitive apps)

### For Frontend Applications
1. **Handle token expiration** gracefully
2. **Clear tokens on logout** 
3. **Don't store sensitive data** in JWT payload
4. **Implement automatic token refresh** when possible
5. **Use secure storage** for tokens (httpOnly cookies preferred)

### For API Consumers
1. **Include Authorization header** on protected endpoints
2. **Handle 401 responses** by redirecting to login
3. **Don't hardcode tokens** in application code
4. **Implement proper error handling** for auth failures
5. **Follow the principle of least privilege** when assigning roles