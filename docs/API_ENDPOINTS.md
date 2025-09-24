# API Endpoints Documentation

Complete reference for all Dynamic Knowledge Base API endpoints with authentication requirements.

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

Legend:
- 🔓 **Public**: No authentication required
- 🔐 **Protected**: JWT token required  
- 👥 **Any Role**: Any authenticated user
- ✏️ **Editor+**: Editor or Admin role required
- 👑 **Admin**: Admin role required

---

## User Authentication

### Register User 🔓
```http
POST /users/register
```

**Request Body:**
```json
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

### Login User 🔓
```http
POST /users/login
```

**Request Body:**
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
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

---

## User Management

### Get All Users 👥
```http
GET /users?search=john&role=Editor&limit=10&offset=0
```

**Query Parameters:**
- `search` (optional): Search by name or email
- `role` (optional): Filter by role (Admin, Editor, Viewer)
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

### Get User by ID 👥
```http
GET /users/:id
```

### Update User 👥
```http
PUT /users/:id
```

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com"
}
```

**Notes:**
- Users can update their own profile
- Admins can update any user
- Role changes require admin privileges

### Delete User 👑
```http
DELETE /users/:id
```

---

## Topic Management

### Create Topic ✏️
```http
POST /topics
```

**Request Body:**
```json
{
  "name": "Machine Learning Basics",
  "content": "Introduction to machine learning concepts and algorithms",
  "parentTopicId": "topic_001"
}
```

### Get All Topics 🔐 (Optional Auth)
```http
GET /topics?search=machine&limit=20&offset=0&includeContent=true
```

**Query Parameters:**
- `search` (optional): Search in name and content
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `includeContent` (optional): Include full content (default: false)

### Get Topic by ID 🔐 (Optional Auth)
```http
GET /topics/:id?version=2&includeHierarchy=false
```

**Query Parameters:**
- `version` (optional): Specific version number
- `includeHierarchy` (optional): Include parent/child info

### Update Topic ✏️
```http
PUT /topics/:id
```

**Request Body:**
```json
{
  "name": "Updated Topic Name",
  "content": "Updated content",
  "parentTopicId": "new_parent_001"
}
```

### Delete Topic 👑
```http
DELETE /topics/:id
```

### Get Topic Hierarchy 🔐 (Optional Auth)
```http
GET /topics/:id/hierarchy?maxDepth=5&direction=both
```

**Query Parameters:**
- `maxDepth` (optional): Maximum depth to traverse (default: 3)
- `direction` (optional): 'up', 'down', or 'both' (default: 'both')

### Get Topic Versions 👥
```http
GET /topics/:id/versions
```

### Restore Topic Version ✏️
```http
POST /topics/:id/restore/:version
```

---

## Resource Management

### Create Resource ✏️
```http
POST /resources
```

**Request Body:**
```json
{
  "topicId": "topic_001",
  "name": "ML Tutorial",
  "url": "https://example.com/ml-tutorial",
  "description": "Comprehensive machine learning tutorial",
  "type": "article"
}
```

**Resource Types:**
- `article`
- `video` 
- `book`
- `course`
- `tool`
- `other`

### Get All Resources 🔐 (Optional Auth)
```http
GET /resources?search=tutorial&type=article&topicId=topic_001&limit=20&offset=0
```

**Query Parameters:**
- `search` (optional): Search in name and description
- `type` (optional): Filter by resource type
- `topicId` (optional): Filter by associated topic
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

### Get Resource by ID 🔐 (Optional Auth)
```http
GET /resources/:id
```

### Update Resource ✏️
```http
PUT /resources/:id
```

**Request Body:**
```json
{
  "name": "Updated Resource Name",
  "url": "https://example.com/updated-url",
  "description": "Updated description",
  "type": "video"
}
```

### Delete Resource 👑
```http
DELETE /resources/:id
```

### Get Resources by Topic 🔐 (Optional Auth)
```http
GET /topics/:id/resources?type=article&limit=20
```

### Bulk Create Resources ✏️
```http
POST /resources/bulk
```

**Request Body:**
```json
{
  "resources": [
    {
      "topicId": "topic_001",
      "name": "Resource 1",
      "url": "https://example.com/1",
      "type": "article"
    },
    {
      "topicId": "topic_001", 
      "name": "Resource 2",
      "url": "https://example.com/2",
      "type": "video"
    }
  ]
}
```

---

## Path Finding

### Find Shortest Path 👥
```http
GET /path/find?startTopicId=topic_001&endTopicId=topic_002&maxDepth=5
```

**Query Parameters:**
- `startTopicId` (required): Starting topic ID
- `endTopicId` (required): Destination topic ID  
- `maxDepth` (optional): Maximum search depth (default: 5)

**Response:**
```json
{
  "success": true,
  "data": {
    "path": [
      {
        "id": "topic_001",
        "name": "Start Topic",
        "distance": 0
      },
      {
        "id": "topic_005", 
        "name": "Intermediate Topic",
        "distance": 1
      },
      {
        "id": "topic_002",
        "name": "End Topic", 
        "distance": 2
      }
    ],
    "totalDistance": 2,
    "pathExists": true
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "status": "error",
  "message": "Error description",
  "code": "ErrorType",
  "timestamp": "2023-09-24T14:30:00.000Z",
  "path": "/api/v1/topics",
  "method": "POST"
}
```

### Common Error Codes

#### Authentication Errors (401)
- `UnauthorizedError`: Invalid or missing token
- `TokenExpiredError`: Token has expired
- `InvalidCredentialsError`: Wrong email/password

#### Authorization Errors (403)
- `ForbiddenError`: Insufficient permissions
- `RoleRequiredError`: Specific role required

#### Validation Errors (400)
- `ValidationError`: Invalid request data
- `RequiredFieldError`: Missing required fields
- `InvalidFormatError`: Invalid data format

#### Not Found Errors (404)
- `NotFoundError`: Resource not found
- `UserNotFoundError`: User does not exist
- `TopicNotFoundError`: Topic does not exist

#### Conflict Errors (409)
- `ConflictError`: Resource already exists
- `DuplicateEmailError`: Email already registered
- `DuplicateUrlError`: Resource URL already exists

#### Server Errors (500)
- `InternalServerError`: Unexpected server error
- `DatabaseError`: Database operation failed

---

## Rate Limiting

Currently no rate limiting implemented, but recommended for production:

```json
{
  "success": false,
  "status": "error", 
  "message": "Rate limit exceeded",
  "code": "RateLimitError",
  "retryAfter": 3600
}
```

---

## Pagination

For endpoints supporting pagination:

**Request:**
```http
GET /topics?limit=20&offset=40
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "total": 150,
      "limit": 20,
      "offset": 40,
      "hasNext": true,
      "hasPrev": true
    }
  }
}
```

---

## Content Negotiation

All endpoints accept and return JSON:
```
Content-Type: application/json
Accept: application/json
```

---

## Status Codes

- `200 OK`: Successful GET, PUT requests
- `201 Created`: Successful POST requests
- `204 No Content`: Successful DELETE requests
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `500 Internal Server Error`: Server error