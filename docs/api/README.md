# 🔌 API Reference Documentation

Comprehensive API documentation for the Student Profiles PWA, including endpoints, data models, authentication, and usage examples.

## 📋 API Overview

### **Live API Documentation**
- **🚀 Interactive API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **🔄 ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **❤️ Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

**Note:** Default backend port is 8000. If using a different port, replace 8000 with your configured port.

### **API Specifications**
- **Framework**: FastAPI (Python)
- **Authentication**: JWT (JSON Web Tokens)
- **Data Format**: JSON
- **Status**: ✅ **Fully Operational**

## 🎯 Quick Start

### **Authentication**
Most API endpoints require authentication. Get your JWT token:

```bash
# Login to get token
curl -X POST "http://127.0.0.1:8000/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"username": "dev@example.com", "password": "dev_password"}'
```

Use the token in requests:
```bash
curl -X GET "http://127.0.0.1:8000/api/protected-endpoint" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Common Endpoints**
- `GET /api/health` - Application health check
- `POST /api/auth/login` - User authentication
- `GET /api/students` - List students (authenticated)
- `POST /api/students` - Create new student (authenticated)

## 📚 Documentation Sections

### **🔗 Endpoints** (`./endpoints.md`) *(Coming Soon)*
Complete reference of all available API endpoints with detailed information:
- **HTTP Methods**: GET, POST, PUT, DELETE
- **Parameters**: Query parameters, path parameters, request body
- **Responses**: Success and error response formats
- **Examples**: Practical usage examples
- **Status Codes**: HTTP status code explanations

### **🔐 Authentication** (`./authentication.md`)
- **[🔐 Complete Authentication Documentation](../development/authentication.md)**
- JWT token management and security features
- Authentication flows and session management
- Security considerations and best practices
- Token refresh mechanisms and error handling

---

## 🔐 Authentication API Endpoints

### **Authentication System Overview**

The API implements a comprehensive JWT-based authentication system with the following features:

- **Dual Token System**: Access tokens (15-minute expiration) and refresh tokens (7-day expiration)
- **HttpOnly Cookies**: Secure token storage preventing XSS attacks
- **Role-Based Access Control**: Four-tier permission system (admin, teacher, driver, student)
- **Automatic Token Refresh**: Seamless session management without user intervention
- **Rate Limiting**: Protection against brute force attacks (30-60 requests/minute)
- **Security Headers**: Comprehensive security headers for production deployment

### **Authentication Endpoints**

#### **POST /api/auth/login**
Authenticate user credentials and establish authenticated session.

**Request Body:**
```json
{
  "username_or_email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Cookies Set:**
- `access_token`: HttpOnly cookie (15-minute expiration)
- `refresh_token`: HttpOnly cookie (7-day expiration)

**Status Codes:**
- `200`: Login successful
- `401`: Invalid credentials or inactive user
- `422`: Validation error (malformed request)

**Example:**
```bash
curl -X POST "http://127.0.0.1:8000/api/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"username_or_email": "admin@example.com", "password": "secure_password"}' \
      -c cookies.txt
```

---

#### **POST /api/auth/logout**
Clear authentication cookies and revoke current session.

**Response:**
```json
{
  "message": "Successfully logged out"
}
```

**Cookies Cleared:**
- `access_token`: Deleted from client
- `refresh_token`: Deleted from client

**Status Codes:**
- `200`: Logout successful
- `401`: Not authenticated

**Example:**
```bash
curl -X POST "http://127.0.0.1:8000/api/auth/logout" \
      -H "Cookie: $(cat cookies.txt)" \
      -b cookies.txt -c cookies.txt
```

---

#### **POST /api/auth/refresh**
Refresh access token using valid refresh token.

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Status Codes:**
- `200`: Token refreshed successfully
- `401`: Invalid, expired, or missing refresh token
- `422`: Validation error

**Example:**
```bash
curl -X POST "http://127.0.0.1:8000/api/auth/refresh" \
      -H "Cookie: $(cat cookies.txt)"
```

---

#### **GET /api/auth/me**
Retrieve current authenticated user profile information.

**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "role": "admin",
  "is_active": true,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

**Status Codes:**
- `200`: Success
- `401`: Not authenticated or invalid token

**Example:**
```bash
curl -X GET "http://127.0.0.1:8001/api/auth/me" \
     -H "Cookie: $(cat cookies.txt)"
```

---

#### **POST /api/auth/register**
Create new user account (admin only endpoint).

**Required Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Request Body:**
```json
{
  "username": "newteacher",
  "email": "teacher@school.com",
  "password": "secure_password_123",
  "role": "teacher"
}
```

**Response:**
```json
{
  "id": 2,
  "username": "newteacher",
  "email": "teacher@school.com",
  "role": "teacher",
  "is_active": true,
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-01T12:00:00Z"
}
```

**Status Codes:**
- `201`: User created successfully
- `400`: Username or email already exists
- `401`: Not authenticated
- `403`: Insufficient permissions (admin required)
- `422`: Validation error

**Example:**
```bash
curl -X POST "http://127.0.0.1:8001/api/auth/register" \
     -H "Content-Type: application/json" \
     -H "Cookie: $(cat cookies.txt)" \
     -d '{
       "username": "newteacher",
       "email": "teacher@school.com",
       "password": "secure_password_123",
       "role": "teacher"
     }'
```

---

#### **POST /api/auth/guest**
Create or access guest user session for unauthenticated users.

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "guest_123",
    "username": "guest_user_123",
    "email": "guest_123@guest.local",
    "role": "guest",
    "is_active": true,
    "is_guest": true,
    "guest_token": "guest_123",
    "expires_at": "2025-01-02T12:00:00Z"
  },
  "guest_id": "guest_123",
  "expires_at": "2025-01-02T12:00:00Z",
  "is_guest": true
}
```

**Cookies Set:**
- `access_token`: HttpOnly cookie (24-hour expiration for guests)
- `refresh_token`: HttpOnly cookie (7-day expiration)

**Status Codes:**
- `200`: Guest session created/accessed successfully
- `500`: Internal server error

**Example:**
```bash
curl -X POST "http://127.0.0.1:8001/api/auth/guest" \
     -c guest_cookies.txt
```

---

#### **GET /api/auth/guest/dashboard**
Get dashboard data for guest users (limited access).

**Response:**
```json
{
  "guest_access": true,
  "permissions": ["dashboard:read"],
  "summary": {
    "total_students": 150,
    "total_drivers": 5,
    "total_revenue": 45000.00
  },
  "message": "Guest access - limited data available. Sign up for full access."
}
```

**Status Codes:**
- `200`: Dashboard data retrieved successfully
- `403`: Not a guest user or access denied
- `401`: Not authenticated

**Example:**
```bash
curl -X GET "http://127.0.0.1:8001/api/auth/guest/dashboard" \
     -H "Cookie: $(cat guest_cookies.txt)"
```

---

#### **POST /api/auth/bypass-login** (Development/Testing Only)
🚨 **SECURITY WARNING**: This endpoint is for development and testing only. **MUST BE DISABLED IN PRODUCTION**.

Bypass login endpoint that provides immediate authentication without credentials when login bypass is enabled in the configuration.

**Request Body:**
```json
{
  "username": "bypass_user"
}
```

**Response (Success):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "bypass_user",
    "username": "bypass_user",
    "email": "bypass_user@bypass.local",
    "role": "admin",
    "is_active": true,
    "is_bypass_user": true,
    "created_at": "2025-11-08T06:55:31Z",
    "updated_at": "2025-11-08T06:55:31Z"
  }
}
```

**Cookies Set:**
- `access_token`: HttpOnly cookie (15-minute expiration)
- `refresh_token`: HttpOnly cookie (7-day expiration)

**Response (Error - Disabled):**
```json
{
  "detail": "Login bypass is disabled"
}
```

**Status Codes:**
- `200`: Bypass login successful
- `403`: Login bypass disabled
- `422`: Validation error

**Required Configuration:**
- Backend: `LOGIN_BYPASS_ENABLED=true`
- Frontend: `VITE_ENABLE_LOGIN_BYPASS=true`

**Example:**
```bash
curl -X POST "http://127.0.0.1:8000/auth/bypass-login" \
     -H "Content-Type: application/json" \
     -d '{"username": "bypass_user"}' \
     -c cookies.txt
```

**Security Features:**
- Comprehensive audit logging of all bypass attempts
- Virtual user creation (no database storage)
- Role-based access control applies normally
- Visual indicators distinguish bypass users

For complete documentation, see **[Login Bypass Guide](../../development/login-bypass.md)**.

---

#### **POST /api/auth/convert-guest**
Convert guest user to registered user account.

**Request Body:**
```json
{
  "guest_id": "guest_123",
  "username": "newuser",
  "email": "user@school.com",
  "password": "secure_password_123"
}
```

**Response:**
```json
{
  "id": 3,
  "username": "newuser",
  "email": "user@school.com",
  "role": "student",
  "is_active": true,
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-01T12:00:00Z"
}
```

**Status Codes:**
- `200`: Guest converted successfully
- `400`: Invalid guest ID, username/email already exists, or validation error
- `404`: Guest user not found
- `422`: Validation error

**Example:**
```bash
curl -X POST "http://127.0.0.1:8001/api/auth/convert-guest" \
     -H "Content-Type: application/json" \
     -H "Cookie: $(cat guest_cookies.txt)" \
     -d '{
       "guest_id": "guest_123",
       "username": "newuser",
       "email": "user@school.com",
       "password": "secure_password_123"
     }'
```

---

### **Enhanced Authentication Endpoints**

#### **POST /api/auth/login-enhanced**
Enhanced login with device fingerprinting and advanced security features.

**Request Body:**
```json
{
  "username_or_email": "admin@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Security Features:**
- Rate limiting (5 attempts per user, 15-minute lockout)
- Device fingerprinting for session tracking
- Comprehensive audit logging
- Enhanced token generation with RS256 algorithm

**Status Codes:**
- `200`: Login successful
- `401`: Invalid credentials or rate limited
- `429`: Too many login attempts

---

#### **POST /api/auth/token/refresh**
Enhanced token refresh with rotation and security features.

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Security Features:**
- Token rotation for enhanced security
- Refresh token blacklisting after use
- Comprehensive audit logging
- Cookie minimization strategy

**Status Codes:**
- `200`: Token refreshed successfully
- `401`: Invalid or revoked refresh token

---

#### **POST /api/auth/token/revoke**
Revoke all tokens for current user session.

**Response:**
```json
{
  "message": "Successfully logged out and revoked all tokens"
}
```

**Security Features:**
- Comprehensive token revocation
- Session cleanup across all devices
- Secure logout implementation

**Status Codes:**
- `200`: All tokens revoked successfully

---

#### **GET /api/auth/token/validate**
Validate current token and return session status.

**Response:**
```json
{
  "valid": true,
  "user": "admin",
  "role": "admin",
  "expires_in_minutes": 15,
  "token_type": "access"
}
```

**Status Codes:**
- `200`: Token is valid
- `401`: Token is invalid or expired

---

#### **POST /api/auth/cleanup-guests**
Clean up expired guest user accounts (admin only).

**Required Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Response:**
```json
{
  "message": "Successfully cleaned up 5 expired guest accounts",
  "cleaned_count": 5
}
```

**Status Codes:**
- `200`: Cleanup completed successfully
- `401`: Not authenticated
- `403`: Insufficient permissions (admin required)
- `500`: Internal server error

---

### **Authentication Configuration**

#### **Environment Variables**

```bash
# JWT Configuration
SECRET_KEY=your-256-bit-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=30

# CORS Configuration
CORS_ORIGINS='["http://localhost:5173", "http://127.0.0.1:5173"]'

# Guest User Configuration
GUEST_EMAIL_DOMAIN=guest.local
```

#### **Cookie Configuration**

**Development:**
- `secure=False` (allows HTTP)
- `samesite="lax"` (balanced security)

**Production:**
- `secure=True` (HTTPS required)
- `samesite="strict"` (maximum security)

#### **Security Headers**

The API implements comprehensive security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy` (when applicable)

### **Authentication Flow Examples**

#### **Complete Authentication Flow**

```javascript
// 1. Initial login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username_or_email: 'admin@example.com',
    password: 'secure_password'
  }),
  credentials: 'include' // Important for cookies
});

// 2. Automatic token refresh (handled by browser)
setInterval(async () => {
  try {
    await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    // Redirect to login if refresh fails
    window.location.href = '/login';
  }
}, 600000); // Check every 10 minutes

// 3. API requests with automatic cookie inclusion
const apiResponse = await fetch('/api/students', {
  credentials: 'include' // Cookies sent automatically
});
```

#### **Error Handling**

```javascript
// Handle authentication errors gracefully
fetch('/api/protected-endpoint', { credentials: 'include' })
  .then(response => {
    if (response.status === 401) {
      // Token expired or invalid
      window.location.href = '/login';
    } else if (response.status === 403) {
      // Insufficient permissions
      showError('Access denied');
    }
    return response.json();
  })
  .catch(error => {
    console.error('API Error:', error);
  });
```

### **Role-Based Access Examples**

#### **Admin Operations**

```bash
# Create new user (admin only)
curl -X POST "http://127.0.0.1:8001/api/auth/register" \
     -H "Content-Type: application/json" \
     -H "Cookie: $(cat cookies.txt)" \
     -d '{
       "username": "teacher1",
       "email": "teacher1@school.com",
       "password": "password123",
       "role": "teacher"
     }'

# Cleanup expired guests (admin only)
curl -X POST "http://127.0.0.1:8001/api/auth/cleanup-guests" \
     -H "Cookie: $(cat cookies.txt)"
```

#### **Teacher Operations**

```bash
# Get students (teacher access)
curl -X GET "http://127.0.0.1:8001/api/students?class=10th%20Grade" \
     -H "Cookie: $(cat cookies.txt)"

# Get reports (teacher access)
curl -X GET "http://127.0.0.1:8001/api/reports/summary" \
     -H "Cookie: $(cat cookies.txt)"
```

### **Troubleshooting Authentication**

#### **Common Issues and Solutions**

**Issue:** "Token has expired"
**Solution:** The frontend should automatically refresh tokens before expiration

**Issue:** "Invalid token"
**Solution:** Clear cookies and redirect to login page

**Issue:** "Too many login attempts"
**Solution:** Wait 15 minutes or contact administrator to reset rate limiting

**Issue:** "CORS error during authentication"
**Solution:** Verify CORS origins match frontend URL in environment configuration

#### **Debug Information**

Enable debug logging for authentication troubleshooting:

```bash
# Backend debug logging
export LOG_LEVEL=DEBUG

# Check authentication status
curl -v "http://127.0.0.1:8001/api/auth/me" \
     -H "Cookie: $(cat cookies.txt)"
```

### **💾 Database Models** (`./backend-DATABASE_README.md`)
- **[Current Database Documentation](./backend-DATABASE_README.md)**
- Data models and relationships
- Migration scripts and schema
- Database configuration

### **📖 Usage Examples** (`./examples.md`) *(Coming Soon)*
- **Code Examples**: Language-specific integration examples
- **cURL Commands**: Command-line API testing
- **JavaScript**: Frontend integration examples
- **Python**: Backend-to-backend communication

## 🚀 API Status & Versioning

### **Current Version**
- **Version**: 1.0.0
- **Status**: Stable
- **Last Updated**: October 2025

### **Versioning Strategy**
- **URL Versioning**: `/api/v1/`
- **Header Versioning**: `Accept: application/vnd.api.v1+json`
- **Breaking Changes**: Major version increments

### **Changelog** (`./changelog.md`) *(Coming Soon)*
- API changes and updates
- Breaking change notifications
- Migration guides for new versions

## 🛠️ Development & Testing

### **Local Development**
```bash
# Start the API server
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000

# View documentation
open http://127.0.0.1:8000/docs
```

### **Testing the API**
```bash
# Health check
curl http://127.0.0.1:8000/api/health

# Authenticated request (after login)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://127.0.0.1:8000/api/students
```

## 🔧 Configuration

### **Environment Variables**
```bash
# API Configuration
API_HOST=127.0.0.1
API_PORT=8000
DEBUG=false

# JWT Configuration
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS Settings
BACKEND_CORS_ORIGINS=["http://localhost:3002", "http://127.0.0.1:3002"]
```

### **CORS Configuration**
The API supports Cross-Origin Resource Sharing for:
- Local development (`http://localhost:3002`)
- Frontend application (`http://127.0.0.1:3002`)
- Production domains (configured per environment)

## 🚨 Error Handling

### **Standard Error Format**
```json
{
  "detail": "Error description",
  "error_code": "SPECIFIC_ERROR_CODE",
  "timestamp": "2025-10-20T05:32:14Z"
}
```

### **Common HTTP Status Codes**
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **422**: Validation Error
- **500**: Internal Server Error

## 📞 Support & Resources

### **Getting Help**
- **🐛 Troubleshooting**: [../../troubleshooting/](../../troubleshooting/)
- **💻 Development**: [../../development/](../../development/)
- **🔧 Dev Setup**: [../../troubleshooting/dev-user-setup.md](../../troubleshooting/dev-user-setup.md)

### **External Resources**
- **[FastAPI Documentation](https://fastapi.tiangolo.com/)** - Web framework documentation
- **[JWT Guide](https://jwt.io/)** - JSON Web Token specification
- **[REST API Guidelines](https://restfulapi.net/)** - API design best practices

---

## 🎯 Related Documentation

- **[🏗️ Backend Setup](../../development/backend/)** - Backend configuration and setup
- **[🔐 Authentication Guide](../../development/authentication.md)** - Security and JWT implementation
- **[💾 Database Documentation](./backend-DATABASE_README.md)** - Data models and schema
- **[🐛 API Troubleshooting](../../troubleshooting/)** - Common API issues

For additional help or to report issues, please refer to the **[Support Documentation](../../troubleshooting/support.md)** or create an issue in the project repository.

---

**Last Updated:** October 2025