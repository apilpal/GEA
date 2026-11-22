# Security Features Documentation

## Overview

The Student Profiles PWA implements comprehensive security measures including rate limiting, input validation, CORS protection, and secure authentication. This document outlines all security features and best practices implemented in the application.

## Rate Limiting

### Backend Rate Limiting (SlowAPI)

The application implements configurable rate limiting to prevent abuse and ensure fair usage:

#### Default Limits
- **General Endpoints**: 30-60 requests per minute
- **Authentication Endpoints**: 5-10 requests per minute (stricter limits)
- **Admin Endpoints**: 30 requests per minute (moderate limits)

#### Configuration

```python
# In main.py - Rate limiting configuration
from slowapi import Limiter, MemoryStore
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware

# Global rate limiter instance
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",  # Use Redis in production
    default_limits=["60 per minute"]  # Global default
)

# Apply middleware to FastAPI app
app.add_middleware(SlowAPIMiddleware, limiter=limiter)
```

#### Endpoint-Specific Limits

```python
# In routers/auth.py
@limiter.limit("5 per minute")  # Stricter limit for login
@router.post("/login", response_model=TokenResponse)
async def login(...): ...

@limiter.limit("10 per minute")  # Moderate limit for token refresh
@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(...): ...

@limiter.limit("30 per minute")  # Standard limit for user registration
@router.post("/register", response_model=User)
async def register_user(...): ...
```

### Rate Limit Headers

The API returns rate limit information in response headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1634567890
X-RateLimit-Retry-After: 60
```

## Input Validation and Sanitization

### Pydantic Models

All API endpoints use Pydantic models for input validation:

```python
# In models.py
class LoginRequest(BaseModel):
    username_or_email: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=128)

class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, regex="^[a-zA-Z0-9_-]+$")
    email: EmailStr = Field(..., max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = Field(default=UserRole.student)
```

### SQL Injection Prevention

- **Parameterized Queries**: All database queries use parameterized statements
- **ORM Usage**: SQLAlchemy ORM prevents injection by design
- **Input Escaping**: Automatic escaping of special characters

```python
# Safe query example
user = await db.execute(
    select(DBUser).where(DBUser.email == user_email)  # Parameterized
)
```

## CORS Protection

### Dynamic CORS Configuration

CORS origins are dynamically configured based on environment variables:

```python
# In main.py
from fastapi.middleware.cors import CORSMiddleware

origins = [
    f"http://127.0.0.1:{os.getenv('FRONTEND_PORT', '5173')}",
    f"http://localhost:{os.getenv('FRONTEND_PORT', '5173')}",
    "http://127.0.0.1:5173",  # Default fallback
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

## Authentication Security

### JWT Token Security

#### Token Configuration
```python
# In auth_utils.py
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # Short-lived access tokens
REFRESH_TOKEN_EXPIRE_DAYS = 7     # Longer-lived refresh tokens

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```

### Secure Cookie Settings

```python
# HttpOnly cookies prevent XSS attacks
response.set_cookie(
    key="access_token",
    value=access_token,
    httponly=True,        # Prevents JavaScript access
    secure=False,        # Set to True in HTTPS production
    samesite="lax",      # CSRF protection
    max_age=15 * 60      # 15 minutes
)
```

## Password Security

### Password Hashing

```python
# In auth_utils.py
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

### Password Requirements

- **Minimum Length**: 8 characters
- **Maximum Length**: 128 characters
- **Hashing Algorithm**: bcrypt with salt rounds
- **Storage**: Only hashed passwords stored in database

## HTTPS and TLS Security

### Production HTTPS Configuration

```python
# Production HTTPS settings
response.set_cookie(
    key="access_token",
    value=access_token,
    httponly=True,
    secure=True,         # HTTPS only
    samesite="strict",   # Strict CSRF protection
    max_age=15 * 60
)
```

### Security Headers

The application implements comprehensive security headers:

```python
# Security headers middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
```

## Role-Based Access Control (RBAC)

### User Roles Hierarchy

| Role | Level | Permissions |
|------|-------|-------------|
| **admin** | 1 | Full system access, user management, system configuration |
| **teacher** | 2 | Student data access, reports, classroom management |
| **driver** | 3 | Route information, student assignments, transport data |
| **student** | 4 | Personal profile, basic information access |

### Permission Checking

```python
# In auth_utils.py
def require_admin(current_user: User) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def require_teacher_or_admin(current_user: User) -> User:
    if current_user.role not in [UserRole.admin, UserRole.teacher]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher or admin access required"
        )
    return current_user
```

## Database Security

### Connection Security

```python
# In config.py
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./students.db"
)

# Production PostgreSQL with SSL
# DATABASE_URL = "postgresql+asyncpg://user:pass@host:5432/db?ssl=require"
```

### Query Security

- **No Raw SQL**: All database operations use SQLAlchemy ORM
- **Parameterized Queries**: Automatic prevention of SQL injection
- **Connection Pooling**: Proper connection management and limits

## Error Handling Security

### Secure Error Messages

```python
# In main.py - Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},  # No sensitive information
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    # Log full error details for debugging
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    # Return generic error message to client
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
```

## API Security

### Request Validation

```python
# All endpoints validate input data
@router.post("/students", response_model=Student)
async def create_student(
    student: CreateStudentRequest,  # Pydantic validation
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)  # Auth required
):
    # Create student logic
```

### Response Sanitization

- **No Sensitive Data**: Passwords and internal IDs excluded from responses
- **Input Validation**: All inputs validated before processing
- **Output Encoding**: Proper JSON encoding to prevent injection

## Environment-Based Security

### Development vs Production

```python
# In config.py
class Settings(BaseSettings):
    # Development settings
    debug: bool = Field(default=True, env="DEBUG")
    cors_origins: List[str] = Field(default=["http://localhost:5173"])

    # Production settings
    secret_key: str = Field(..., env="SECRET_KEY")
    database_url: str = Field(..., env="DATABASE_URL")
    https_only: bool = Field(default=True, env="HTTPS_ONLY")

    class Config:
        env_file = ".env.production" if os.getenv("ENVIRONMENT") == "production" else ".env.development"
```

## Security Monitoring

### Audit Logging

```python
# In auth_utils.py
async def log_security_event(event_type: str, user_id: int, details: dict):
    log_entry = {
        "event_type": event_type,
        "user_id": user_id,
        "timestamp": datetime.utcnow(),
        "ip_address": get_client_ip(),
        "user_agent": get_user_agent(),
        **details
    }

    # Log to security log file or service
    logger.info(f"Security event: {log_entry}")
```

### Failed Login Tracking

```python
# Track failed login attempts
failed_attempts = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION = 15 * 60  # 15 minutes

async def track_failed_login(username: str):
    if username not in failed_attempts:
        failed_attempts[username] = []

    failed_attempts[username].append(datetime.utcnow())

    # Clean old attempts
    cutoff = datetime.utcnow() - timedelta(seconds=LOCKOUT_DURATION)
    failed_attempts[username] = [
        attempt for attempt in failed_attempts[username]
        if attempt > cutoff
    ]
```

## Testing Security Features

### Security Test Coverage

```python
# In test_security.py
def test_rate_limiting():
    """Test that rate limiting works correctly"""
    # Make multiple rapid requests
    for i in range(70):  # Exceed 60/minute limit
        response = client.post("/api/students")
        if i < 60:
            assert response.status_code == 200
        else:
            assert response.status_code == 429

def test_sql_injection_prevention():
    """Test that SQL injection attempts are blocked"""
    malicious_input = "'; DROP TABLE students; --"
    response = client.post("/api/students", json={"name": malicious_input})
    assert response.status_code == 422  # Validation error

def test_cors_headers():
    """Test that CORS headers are properly set"""
    response = client.options("/api/students")
    assert "Access-Control-Allow-Origin" in response.headers
```

## Security Best Practices Checklist

### ✅ Implemented Features

- [x] Rate limiting on all endpoints
- [x] Input validation with Pydantic
- [x] SQL injection prevention
- [x] XSS protection via HttpOnly cookies
- [x] CSRF protection with SameSite cookies
- [x] Secure password hashing (bcrypt)
- [x] Role-based access control
- [x] Security headers implementation
- [x] CORS protection with dynamic configuration
- [x] Secure error handling
- [x] Environment-based security settings
- [x] Audit logging for security events

### 🔒 Security Headers Reference

| Header | Purpose | Value |
|--------|---------|-------|
| `X-Content-Type-Options` | Prevents MIME sniffing | `nosniff` |
| `X-Frame-Options` | Prevents clickjacking | `DENY` |
| `X-XSS-Protection` | Enables XSS filtering | `1; mode=block` |
| `Strict-Transport-Security` | Enforces HTTPS | `max-age=31536000` |
| `Content-Security-Policy` | Controls resource loading | `default-src 'self'` |

## Troubleshooting Security Issues

### Common Issues

#### Rate Limiting Too Strict
**Symptoms:** Legitimate requests being blocked
**Solution:** Adjust rate limits in configuration or use Redis for distributed limiting

#### CORS Errors
**Symptoms:** Frontend requests blocked by CORS policy
**Solution:** Verify CORS origins match frontend URL exactly

#### Cookie Issues
**Symptoms:** Authentication lost on page refresh
**Solution:** Check cookie domain/path settings and HTTPS configuration

#### Token Expiration
**Symptoms:** API requests fail with 401 errors
**Solution:** Implement automatic token refresh in frontend

## Performance Impact

### Security Feature Overhead

| Feature | Performance Impact | Benefit |
|---------|-------------------|---------|
| Rate Limiting | Low (memory-based) | High (prevents abuse) |
| Input Validation | Low | High (prevents attacks) |
| Password Hashing | Medium | High (security) |
| CORS Checking | Low | Medium (prevents CSRF) |
| Audit Logging | Medium | High (compliance) |

## Future Security Enhancements

### Planned Improvements

1. **Two-Factor Authentication (2FA)**
   - SMS-based verification
   - TOTP (Time-based One-Time Password)
   - Hardware token support

2. **Advanced Rate Limiting**
   - Redis-based distributed limiting
   - User-tier based limits
   - Adaptive rate limiting based on behavior

3. **Enhanced Monitoring**
   - Real-time security event monitoring
   - Automated threat detection
   - Security metrics dashboard

4. **API Security**
   - API key authentication for external access
   - OAuth 2.0 integration
   - API versioning and deprecation

## Compliance and Standards

### Security Standards

- **OWASP Top 10**: Protection against common web vulnerabilities
- **GDPR Compliance**: Data protection and privacy measures
- **HTTPS Enforcement**: Secure communication protocols
- **Audit Trail**: Comprehensive logging for compliance

## Related Documentation

- [Authentication Guide](authentication.md)
- [API Documentation](../api/database.md)
- [Deployment Security](../../../deployment/security.md)
- [Troubleshooting Guide](../troubleshooting/TROUBLESHOOTING.md)