# API Documentation

The API follows RESTful principles and provides comprehensive endpoints for managing students, drivers, reports, and charts. All endpoints return JSON responses and use standard HTTP status codes.

## Authentication Endpoints

All API endpoints except `/auth/login` and `/auth/refresh` require authentication. Include the access token in the `Authorization` header or as an HttpOnly cookie.

### User Authentication

- **POST** `/auth/login`
  - Authenticate user credentials
  - **Request Body:**
    ```json
    {
      "username_or_email": "admin@example.com",
      "password": "securepassword"
    }
    ```
  - **Response:** User profile with authentication cookies set

- **POST** `/auth/logout`
  - Clear authentication session
  - **Response:** Success confirmation with cookies cleared

- **POST** `/auth/refresh`
  - Refresh access token using valid refresh token
  - **Response:** New access token

- **GET** `/auth/me`
  - Get current authenticated user profile
  - **Response:** Complete user information

### User Management (Admin Only)

- **POST** `/auth/register`
  - Create new user account
  - **Request Body:**
    ```json
    {
      "username": "newuser",
      "email": "user@example.com",
      "password": "securepassword",
      "role": "teacher"
    }
    ```

## Student Management Endpoints

### Core CRUD Operations

- **GET** `/api/students`
  - Retrieve paginated student list
  - **Query Parameters:**
    - `skip` (integer, default: 0)
    - `limit` (integer, default: 100, max: 1000)
  - **Response:**
    ```json
    {
      "data": [...],
      "total": 150,
      "skip": 0,
      "limit": 100
    }
    ```

- **GET** `/api/students/{student_id}`
  - Get detailed student profile
  - **Response:** Complete student information including contact details and location

- **POST** `/api/students`
  - Create new student record
  - **Request Body:** Complete student data object

- **PUT** `/api/students/{student_id}`
  - Update existing student record
  - **Request Body:** Partial student data for updates

- **DELETE** `/api/students/{student_id}`
  - Remove student record
  - **Response:** Success confirmation

### Advanced Student Operations

- **GET** `/api/students/search`
  - Search students by name, father name, or other fields
  - **Query Parameter:** `q` (search query)
  - **Response:** Filtered student list

## Driver Management Endpoints

- **GET** `/api/drivers`
  - Get all drivers with pagination
  - **Query Parameters:** `skip`, `limit`

- **GET** `/api/drivers/{driver_name}`
  - Get students assigned to specific driver

- **GET** `/api/drivers/{driver_name}/info`
  - Get detailed driver information and statistics

- **POST** `/api/drivers`
  - Create new driver record

- **PUT** `/api/drivers/{driver_name}`
  - Update driver information

## Analytics and Reporting Endpoints

- **GET** `/api/reports/summary`
  - Comprehensive system statistics
  - **Response:**
    ```json
    {
      "total_students": 150,
      "total_drivers": 5,
      "total_revenue": 45000.00,
      "students_by_driver": {...},
      "revenue_by_class": {...}
    }
    ```

- **GET** `/api/reports/students-by-driver`
  - Students organized by driver assignment

- **GET** `/api/reports/revenue-analysis`
  - Revenue breakdown by driver and class

- **GET** `/api/reports/driver-student-stats`
  - Detailed driver-student statistics

## Chart Data Endpoints

- **GET** `/api/charts/student-distribution`
  - Student count by driver for bar charts
  - **Response:**
    ```json
    {
      "labels": ["Driver A", "Driver B", "Driver C"],
      "data": [25, 30, 20]
    }
    ```

- **GET** `/api/charts/revenue-by-driver`
  - Revenue breakdown by driver for pie charts

- **GET** `/api/charts/revenue-by-class`
  - Revenue analysis by class for bar charts

## System Health Endpoints

- **GET** `/api/health`
  - API health check
  - **Response:**
    ```json
    {
      "status": "healthy",
      "timestamp": "2025-10-18T17:08:30Z",
      "version": "1.0.0"
    }
    ```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Default Limit:** 30-60 requests per minute per IP
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Error Handling

All endpoints return consistent error responses:

```json
{
  "detail": "Error description",
  "type": "error_type",
  "status_code": 400
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `429`: Too Many Requests
- `500`: Internal Server Error

## SDK and Integration Examples

### JavaScript/TypeScript Client

```javascript
import { ApiService } from './services/api-service';

const apiService = new ApiService();

// Get paginated students
const students = await apiService.get('/api/students?skip=0&limit=50');

// Create new student
const newStudent = await apiService.post('/api/students', {
  name: 'John Doe',
  father_name: 'Robert Doe',
  class: '10th Grade',
  // ... other fields
});

// Update student
const updatedStudent = await apiService.put('/api/students/123', {
  fees: 1500.00
});
```

### Python Client

```python
import httpx

async with httpx.AsyncClient() as client:
    # Get students with authentication
    response = await client.get(
        'http://127.0.0.1:8000/api/students',
        cookies={'access_token': 'your-jwt-token'}
    )
    students = response.json()
```

### cURL Examples

```bash
# Get students (with authentication cookie)
curl -X GET "http://127.0.0.1:8000/api/students" \
     -H "Cookie: access_token=your-jwt-token"

# Create new student
curl -X POST "http://127.0.0.1:8000/api/students" \
     -H "Content-Type: application/json" \
     -H "Cookie: access_token=your-jwt-token" \
     -d '{
       "name": "Jane Smith",
       "father_name": "Michael Smith",
       "class": "9th Grade",
       "fees": 1200.50
     }'
```

## API Versioning

The API uses URL versioning. Current version is `v1`:
- Base URL: `http://127.0.0.1:8000/api/v1/`
- Current endpoints are unversioned but follow v1 specification

## WebSocket Support (Future)

Real-time updates will be available via WebSocket connections:
- URL: `ws://127.0.0.1:8000/ws/students`
- Events: student_created, student_updated, student_deleted

## Enhanced Guest Dashboard API

### Guest Authentication Endpoints

- **POST** `/auth/guest`
  - Create guest session
  - **Response:** Guest user profile with session token

- **GET** `/auth/guest/dashboard`
  - Get guest dashboard data with sample statistics
  - **Response:** Dashboard summary with sample data

- **POST** `/auth/convert-guest`
  - Convert guest user to registered user
  - **Request Body:**
    ```json
    {
      "username": "newuser",
      "email": "user@example.com",
      "password": "securepassword"
    }
    ```

### Sample Data API

- **POST** `/admin/seed-sample-data`
  - Populate database with sample data for guest dashboard
  - **Query Parameters:**
    - `clear` (boolean): Clear existing data before seeding
    - `verbose` (boolean): Enable verbose logging

## Data Structure

Each student object contains:
- **Basic Information**: name, father's name, class, fees
- **Contact Details**: primary/secondary mobile numbers, father contact
- **Location Information**: route number, area, full address
- **Type Safety**: All data validated using Pydantic models

## Authentication System

For comprehensive authentication documentation including security features, implementation details, and troubleshooting, please see our [Authentication Guide](../development/authentication.md).

### Overview

The authentication system implements industry-standard practices for enterprise-grade security:
- **JWT Tokens**: Access tokens (15-minute expiration) and refresh tokens (7-day expiration)
- **Secure Storage**: HttpOnly cookies prevent XSS attacks while maintaining CSRF protection
- **Role-Based Access**: Four user roles (admin, teacher, driver, student) with hierarchical permissions
- **Automatic Refresh**: Seamless token renewal without user intervention
- **Password Security**: bcrypt hashing with salt for secure credential storage
- **Session Management**: Proactive session handling with automatic cleanup
- **User Management**: Complete CRUD operations for user accounts

### Setup Requirements

Configure the following environment variables for authentication:

```bash
# Required for JWT security (generate a strong 256-bit key)
SECRET_KEY=your-256-bit-secret-key-here

# Optional token expiration settings (defaults shown)
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Optional database settings (defaults to SQLite)
DATABASE_URL=sqlite:///./data/students.db
```

### Authentication Endpoints

#### User Authentication

- `POST /auth/login`: Authenticate with username/email and password
  - **Request Body**: `{"username_or_email": "string", "password": "string"}`
  - **Response**: Sets HttpOnly cookies, returns user profile
  - **Error Responses**: 401 for invalid credentials, 400 for inactive users

- `POST /auth/logout`: Clear authentication cookies and blacklist current access token
  - **Response**: Success message, clears all auth cookies

- `POST /auth/refresh`: Generate new access token using valid refresh token
  - **Response**: New access token (cookies updated automatically)
  - **Error Responses**: 401 for invalid/expired refresh token

- `GET /auth/me`: Retrieve current authenticated user profile information
  - **Response**: Complete user profile with role and status
  - **Auth Required**: Valid access token

#### User Management (Admin Only)

- `POST /auth/register`: Create new user accounts with role assignment
  - **Request Body**: `{"username": "string", "email": "string", "password": "string", "role": "admin|teacher|driver|student"}`
  - **Response**: Created user profile (without password)
  - **Auth Required**: Admin role required
  - **Validation**: Unique username/email constraints

- `PUT /auth/me`: Update current user's profile information
  - **Request Body**: `{"username": "string", "email": "string"}` (optional fields)
  - **Response**: Updated user profile
  - **Auth Required**: Current user authentication
  - **Validation**: Unique constraints for username/email

### Frontend Authentication Components

#### Login Component (`<login-component>`)

A custom web component providing secure login functionality:

```html
<login-component></login-component>
```

**Features:**
- Custom `<login-component>` web component with form validation
- Real-time input validation and error feedback
- Loading states and accessibility support (ARIA labels, focus management)
- Secure credential handling with autocomplete prevention
- Keyboard navigation support (Enter to submit, Tab navigation)

**Usage in JavaScript/TypeScript:**
```javascript
import { LoginComponent } from './components/auth/login-component';

// Component auto-registers, use in HTML or dynamically
const login = new LoginComponent();
login.reset(); // Clear form
login.focusUsername(); // Focus username field
```

#### Authentication Context

Global state management for authentication across the application:

```javascript
import { authContext, useAuth } from './components/auth/auth-context';

// Initialize on app startup
await authContext.initialize();

// Subscribe to auth state changes
const unsubscribe = authContext.subscribe((state) => {
  console.log('Auth state:', state);
});

// Use in components
function MyComponent() {
  const { state, login, logout } = useAuth();

  if (state.isAuthenticated) {
    return <div>Welcome, {state.user.username}!</div>;
  }
}
```

**Features:**
- Global authentication state management across the application
- Subscription-based state updates for reactive UI components
- Automatic session initialization on app startup
- Role-based permission checking utilities (`hasRole`, `isAdmin`, etc.)
- Error state management with user-friendly messages

#### Additional Components

- **`<logout-component>`**: Logout button with confirmation
- **`<register-component>`**: User registration form (admin only)
- **`<profile-component>`**: User profile management
- **`<user-session-component>`**: Session status and management

### Session Handling & Token Management

#### Automatic Token Refresh

- **Proactive Refresh**: Tokens refreshed 5 minutes before expiration
- **Concurrent Protection**: Prevents multiple simultaneous refresh requests
- **Fallback Handling**: Graceful degradation on refresh failures
- **Session Continuity**: Users remain logged in during refresh operations

#### Session Lifecycle

1. **Login**: User credentials validated, JWT tokens generated and stored in HttpOnly cookies
2. **Active Session**: Access tokens used for API requests, automatic refresh when needed
3. **Logout**: All tokens blacklisted, cookies cleared, local state reset
4. **Session Recovery**: Automatic session restoration on page refresh

#### Cookie Configuration

```javascript
// HttpOnly cookies set by backend
access_token: "eyJ0eXAi..." // 15 minutes, HttpOnly, SameSite=lax
refresh_token: "eyJ0eXAi..." // 7 days, HttpOnly, SameSite=lax
```

### Security Features

#### Cookie-Based Authentication

- **HttpOnly Cookies**: Prevent JavaScript access (XSS protection)
- **SameSite=lax**: Prevents CSRF attacks while allowing legitimate requests
- **Secure Flag**: Enabled in production (HTTPS required)
- **Path Restriction**: Cookies scoped to `/` path only
- **Domain Restriction**: Cookies tied to specific domain

#### Token Security

- **HS256 Algorithm**: Industry-standard HMAC-SHA256 signing
- **Configurable Secret**: Environment-based 256-bit secret key
- **Token Blacklisting**: Access tokens blacklisted on logout
- **Type Validation**: Strict access vs refresh token validation
- **Expiration Validation**: Timezone-aware timestamp validation

#### Password Security

- **bcrypt Hashing**: Adaptive password hashing with automatic salt generation
- **Minimum Requirements**: Enforced password complexity rules
- **No Plaintext Storage**: Passwords never stored or transmitted in plain text
- **Secure Transmission**: All authentication over HTTPS in production

#### Role-Based Access Control

Hierarchical permission system with escalating privileges:

- **Student**: Profile viewing, limited personal data access
- **Driver**: Route management, student assignment visibility, transport operations
- **Teacher**: Student management, reporting access, limited admin functions
- **Admin**: Full system access, user management, all operations

**Permission Checking:**
```javascript
// In frontend components
if (authContext.isTeacherOrAdmin()) {
  // Show admin features
}

// In backend endpoints
@router.post("/admin-only")
async def admin_endpoint(current_user: User = Depends(require_admin)):
    # Only accessible to admins
```

#### Additional Security Measures

- **Rate Limiting**: API endpoints protected against brute force attacks
- **CORS Configuration**: Proper cross-origin request handling
- **Input Validation**: Comprehensive request validation using Pydantic
- **SQL Injection Protection**: Parameterized queries via SQLAlchemy
- **XSS Prevention**: Content Security Policy headers
- **Audit Logging**: Authentication events logged for security monitoring

### Configuration Options

#### Token Expiration

```bash
# Access tokens (short-lived for security)
ACCESS_TOKEN_EXPIRE_MINUTES=15

# Refresh tokens (long-lived for convenience)
REFRESH_TOKEN_EXPIRE_DAYS=7
```

#### Security Settings

- **Development Mode**: Relaxed cookie security for local development
- **Production Mode**: Strict HTTPS-only cookies and security headers
- **CORS Policy**: Configurable origins for cross-domain requests
- **Rate Limits**: Configurable request limits (30-60 requests/minute)

#### User Role Permissions Matrix

| Feature | Student | Driver | Teacher | Admin |
|---------|---------|--------|---------|-------|
| View Profile | ✓ | ✓ | ✓ | ✓ |
| Edit Profile | ✓ | ✓ | ✓ | ✓ |
| View Students | ✗ | Assigned | ✓ | ✓ |
| Manage Students | ✗ | ✗ | ✓ | ✓ |
| View Reports | ✗ | Personal | ✓ | ✓ |
| Manage Routes | ✗ | Assigned | ✓ | ✓ |
| User Management | ✗ | ✗ | ✗ | ✓ |
| System Config | ✗ | ✗ | ✗ | ✓ |

### Authentication Flow Examples

#### Complete Login Flow

```javascript
// 1. User submits login form
await authContext.login({
  username_or_email: "admin@example.com",
  password: "securepassword"
});

// 2. Backend validates credentials
// 3. JWT tokens generated and set as HttpOnly cookies
// 4. User profile returned to frontend
// 5. Auth context updates state and notifies subscribers
```

#### API Request with Authentication

```javascript
// Automatic cookie inclusion (no manual token handling needed)
const response = await apiService.get('/api/students');

// Token refresh happens automatically if needed
// Failed requests trigger re-authentication flow
```

#### User Registration (Admin Only)

```javascript
// Admin creates new teacher account
const newUser = await apiService.post('/auth/register', {
  username: "teacher1",
  email: "teacher1@school.com",
  password: "temporarypassword",
  role: "teacher"
});
```

### Troubleshooting Authentication

#### Common Issues

- **"Authentication expired"**: Refresh token expired, user needs to login again
- **"Invalid credentials"**: Check username/email and password spelling
- **"User inactive"**: Account disabled by administrator
- **"Access denied"**: Insufficient permissions for requested operation

#### Debug Mode

Enable debug logging for authentication troubleshooting:
```bash
LOG_LEVEL=DEBUG
```

#### Session Recovery

If authentication state is lost:
1. Refresh the page (automatic session restoration)
2. Check browser cookie settings
3. Verify backend connectivity
4. Clear browser cache if issues persist

### Integration with Application Architecture

The authentication system integrates seamlessly with the overall application architecture:
- **Router Integration**: Authentication checks on route navigation
- **API Service Integration**: Automatic token inclusion in requests
- **Component Architecture**: Auth-aware UI components with permission checks
- **State Management**: Centralized auth state with reactive updates
- **Error Handling**: Global authentication error handling and recovery

This comprehensive API documentation provides all the information needed to integrate with and use the Student Profiles PWA backend services effectively.