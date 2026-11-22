# Security Considerations

## Authentication & Authorization

### JWT Token Security

The application implements industry-standard JWT authentication with the following security measures:

- **Token Signing:** HS256 algorithm with 256-bit secret key
- **Token Expiration:** Short-lived access tokens (15 minutes) with refresh tokens (7 days)
- **Secure Storage:** HttpOnly cookies prevent JavaScript access (XSS protection)
- **SameSite Protection:** Lax SameSite policy prevents CSRF attacks
- **Token Blacklisting:** Access tokens blacklisted on logout

```python
# backend/auth_utils.py - JWT Configuration
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access"):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != token_type:
            raise JWTError("Invalid token type")
        return payload
    except JWTError:
        return None
```

### Password Security

- **bcrypt Hashing:** Adaptive password hashing with automatic salt generation
- **Minimum Requirements:** Enforced password complexity rules
- **No Plaintext Storage:** Passwords never stored or transmitted in plain text

```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
```

### Role-Based Access Control (RBAC)

Hierarchical permission system with escalating privileges:

| Role | Permissions | Use Case |
|------|-------------|----------|
| **Student** | Profile viewing, personal data access | Self-service student portal |
| **Driver** | Route management, assigned student visibility | Transportation operations |
| **Teacher** | Student management, reporting access | Academic administration |
| **Admin** | Full system access, user management | System administration |

```python
# backend/auth_utils.py - Permission Checking
from enum import Enum

class UserRole(str, Enum):
    STUDENT = "student"
    DRIVER = "driver"
    TEACHER = "teacher"
    ADMIN = "admin"

def require_role(required_role: UserRole):
    def role_checker(current_user: User = Depends(get_current_user)):
        role_hierarchy = {
            UserRole.STUDENT: 1,
            UserRole.DRIVER: 2,
            UserRole.TEACHER: 3,
            UserRole.ADMIN: 4
        }

        if role_hierarchy.get(current_user.role, 0) < role_hierarchy.get(required_role, 0):
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker

# Usage in endpoints
@router.post("/admin/users", dependencies=[Depends(require_role(UserRole.ADMIN))])
async def create_user(user_data: UserCreate):
    # Only admins can access
```

## API Security

### Rate Limiting

Implementation using SlowAPI to prevent abuse:

```python
# backend/main.py - Rate Limiting Setup
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

limiter = Limiter(key_func=get_remote_address, default_limits=["30/minute"])

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Endpoint-specific limits
@router.get("/api/students")
@limiter.limit("60/minute")
async def get_students():
    # Limited to 60 requests per minute
```

### Input Validation

Comprehensive validation using Pydantic models:

```python
# backend/models.py - Input Validation
from pydantic import BaseModel, validator, Field
from typing import Optional, List
import re

class StudentBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    father_name: str = Field(..., min_length=2, max_length=100)
    class: str = Field(..., pattern=r'^\d+(st|nd|rd|th) Grade$')
    fees: float = Field(..., gt=0, le=10000)
    primary_mobile: str = Field(..., regex=r'^\d{10}$')
    secondary_mobile: Optional[str] = Field(None, regex=r'^\d{10}$')
    father_contact: Optional[str] = Field(None, regex=r'^\d{10}$')
    route_number: str = Field(..., min_length=1, max_length=10)
    area: str = Field(..., min_length=2, max_length=50)
    address: str = Field(..., min_length=10, max_length=200)

    @validator('fees')
    def fees_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Fees must be positive')
        return round(v, 2)

    @validator('primary_mobile')
    def validate_mobile_uniqueness(cls, v, values):
        # Check uniqueness in database
        if existing_student := get_student_by_mobile(v):
            raise ValueError('Mobile number already exists')
        return v

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    fees: Optional[float] = Field(None, gt=0, le=10000)
    # Only allow updating specific fields
```

### SQL Injection Prevention

Parameterized queries via SQLAlchemy ORM:

```python
# Safe query construction
async def get_students_by_driver(driver_name: str, db: AsyncSession):
    # Parameterized query prevents SQL injection
    result = await db.execute(
        select(Student).where(Student.driver_name == driver_name)
    )
    return result.scalars().all()

# Dynamic query building (still safe)
async def search_students(query: str, db: AsyncSession):
    search_filter = f"%{query}%"
    result = await db.execute(
        select(Student).where(
            or_(
                Student.name.ilike(search_filter),
                Student.father_name.ilike(search_filter)
            )
        )
    )
    return result.scalars().all()
```

## Data Protection

### Encryption at Rest

For sensitive data fields:

```python
# backend/utils/encryption.py
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

class DataEncryption:
    def __init__(self, key: bytes = None):
        if key is None:
            key = self._derive_key(os.getenv("ENCRYPTION_KEY", "default-key"))
        self.cipher = Fernet(key)

    def _derive_key(self, password: str) -> bytes:
        salt = os.getenv("ENCRYPTION_SALT", "default-salt").encode()
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key

    def encrypt(self, data: str) -> str:
        return self.cipher.encrypt(data.encode()).decode()

    def decrypt(self, encrypted_data: str) -> str:
        return self.cipher.decrypt(encrypted_data.encode()).decode()

# Usage for sensitive fields
class Student(Base):
    # ... other fields
    emergency_contact = Column(String, nullable=True)
    medical_info = Column(String, nullable=True)  # Encrypted

    def set_medical_info(self, info: str):
        self.medical_info = encryption.encrypt(info)

    def get_medical_info(self) -> str:
        return encryption.decrypt(self.medical_info) if self.medical_info else ""
```

### Data Sanitization

Client-side and server-side sanitization:

```javascript
// frontend/src/utils/sanitization.js
export function sanitizeInput(input) {
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '')  // Remove angle brackets
    .replace(/javascript:/gi, '')  // Remove javascript: protocol
    .replace(/on\w+=/gi, '')  // Remove event handlers
    .trim();
}

// HTML escaping
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

```python
# backend/utils/sanitization.py
import bleach
from html import escape

def sanitize_html_input(text: str) -> str:
    """Sanitize HTML input to prevent XSS"""
    allowed_tags = ['p', 'br', 'strong', 'em', 'u']
    allowed_attrs = {}

    return bleach.clean(text, tags=allowed_tags, attributes=allowed_attrs, strip=True)

def sanitize_filename(filename: str) -> str:
    """Sanitize uploaded filenames"""
    import re
    # Remove path separators and dangerous characters
    filename = re.sub(r'[\/\\:*?"<>|]', '', filename)
    # Limit length
    return filename[:255]
```

## Network Security

### HTTPS Configuration

Production HTTPS setup with security headers:

```nginx
# nginx.conf - Security Headers
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;

    location /api {
        # API proxy with CORS
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
```

### CORS Configuration

```python
# backend/main.py - CORS Setup
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:5173",  # Development
    "https://your-domain.com",  # Production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

## Session Management

### Secure Session Handling

```python
# backend/auth_utils.py - Session Security
from fastapi import Request, Response
from datetime import datetime, timedelta

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """Set secure authentication cookies"""
    secure = os.getenv("ENVIRONMENT") == "production"
    domain = os.getenv("COOKIE_DOMAIN", "localhost")

    # Access token cookie (short-lived)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=15 * 60,  # 15 minutes
        domain=domain
    )

    # Refresh token cookie (long-lived)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,  # 7 days
        domain=domain
    )

def clear_auth_cookies(response: Response):
    """Clear authentication cookies"""
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")

async def get_current_user(request: Request) -> User:
    """Extract and validate current user from cookies"""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check if token is blacklisted
    if await is_token_blacklisted(token):
        raise HTTPException(status_code=401, detail="Token revoked")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await get_user_by_id(payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    return user
```

## File Upload Security

### Secure File Handling

```python
# backend/routers/uploads.py
from fastapi import UploadFile, File, HTTPException
from pathlib import Path
import magic
import os

ALLOWED_MIME_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'application/pdf': ['.pdf'],
    'text/csv': ['.csv']
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@router.post("/upload/students-csv")
async def upload_students_csv(file: UploadFile = File(...)):
    # Validate file size
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large")

    # Validate MIME type
    mime_type = magic.from_buffer(file_content, mime=True)
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, "Invalid file type")

    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_MIME_TYPES.get(mime_type, []):
        raise HTTPException(400, "File extension does not match content")

    # Sanitize filename
    safe_filename = sanitize_filename(file.filename)

    # Save file securely
    upload_dir = Path("uploads")
    upload_dir.mkdir(exist_ok=True)

    file_path = upload_dir / safe_filename
    with open(file_path, "wb") as f:
        f.write(file_content)

    # Process CSV content
    return await process_students_csv(file_path)
```

## Security Monitoring

### Audit Logging

```python
# backend/utils/audit.py
import logging
from datetime import datetime
from fastapi import Request

audit_logger = logging.getLogger("audit")
audit_logger.setLevel(logging.INFO)

class AuditLogger:
    @staticmethod
    async def log_user_action(
        request: Request,
        user_id: int,
        action: str,
        resource: str,
        resource_id: Optional[int] = None,
        details: Optional[dict] = None
    ):
        """Log user actions for security auditing"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "action": action,
            "resource": resource,
            "resource_id": resource_id,
            "ip_address": request.client.host,
            "user_agent": request.headers.get("user-agent"),
            "details": details or {}
        }

        audit_logger.info("USER_ACTION", extra=log_entry)

    @staticmethod
    async def log_security_event(
        event_type: str,
        severity: str,
        message: str,
        details: Optional[dict] = None
    ):
        """Log security-related events"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "severity": severity,
            "message": message,
            "details": details or {}
        }

        audit_logger.warning("SECURITY_EVENT", extra=log_entry)

# Usage examples
@router.post("/api/students")
async def create_student(
    student: StudentCreate,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    new_student = await student_service.create_student(student)

    await AuditLogger.log_user_action(
        request,
        current_user.id,
        "CREATE",
        "student",
        new_student.id,
        {"student_name": new_student.name}
    )

    return new_student

# Failed login attempt logging
@router.post("/auth/login")
async def login(credentials: LoginCredentials, request: Request):
    user = await authenticate_user(credentials.username_or_email, credentials.password)

    if not user:
        await AuditLogger.log_security_event(
            "FAILED_LOGIN",
            "medium",
            f"Failed login attempt for: {credentials.username_or_email}",
            {
                "ip_address": request.client.host,
                "user_agent": request.headers.get("user-agent")
            }
        )
        raise HTTPException(401, "Invalid credentials")
```

### Security Monitoring Dashboard

```python
# backend/routers/security.py
from fastapi import APIRouter, Depends
from sqlalchemy import func, desc
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/security", tags=["security"])

@router.get("/audit-logs")
async def get_audit_logs(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(require_admin)
):
    """Get audit logs with filtering"""
    query = select(AuditLog).order_by(desc(AuditLog.timestamp))

    if start_date:
        query = query.where(AuditLog.timestamp >= start_date)
    if end_date:
        query = query.where(AuditLog.timestamp <= end_date)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if action:
        query = query.where(AuditLog.action == action)

    result = await db.execute(query.limit(limit))
    return result.scalars().all()

@router.get("/security-stats")
async def get_security_stats(
    days: int = 30,
    current_user: User = Depends(require_admin)
):
    """Get security statistics"""
    start_date = datetime.utcnow() - timedelta(days=days)

    # Failed login attempts
    failed_logins = await db.execute(
        select(func.count()).where(
            and_(
                AuditLog.event_type == "FAILED_LOGIN",
                AuditLog.timestamp >= start_date
            )
        )
    )

    # Suspicious activities
    suspicious = await db.execute(
        select(func.count()).where(
            and_(
                AuditLog.severity.in_(["high", "critical"]),
                AuditLog.timestamp >= start_date
            )
        )
    )

    return {
        "failed_login_attempts": failed_logins.scalar(),
        "suspicious_activities": suspicious.scalar(),
        "period_days": days
    }
```

## Security Best Practices Checklist

### Development Phase

- [ ] Use parameterized queries to prevent SQL injection
- [ ] Implement input validation and sanitization
- [ ] Store secrets securely (environment variables, secret managers)
- [ ] Use HTTPS in production
- [ ] Implement proper error handling without information leakage
- [ ] Regular dependency updates and security patches

### Authentication & Authorization

- [ ] Implement strong password policies
- [ ] Use secure password hashing (bcrypt)
- [ ] Implement session management with proper expiration
- [ ] Use JWT with appropriate expiration times
- [ ] Implement role-based access control
- [ ] Log authentication events

### API Security

- [ ] Implement rate limiting
- [ ] Use proper CORS configuration
- [ ] Validate all input data
- [ ] Implement proper error responses
- [ ] Use secure headers (HSTS, CSP, etc.)
- [ ] Implement API versioning

### Data Protection

- [ ] Encrypt sensitive data at rest
- [ ] Use secure communication (HTTPS/TLS)
- [ ] Implement data backup and recovery
- [ ] Regular security audits and penetration testing
- [ ] Implement data retention policies

### Infrastructure Security

- [ ] Use firewalls and security groups
- [ ] Implement monitoring and alerting
- [ ] Regular system updates and patches
- [ ] Use intrusion detection systems
- [ ] Implement backup and disaster recovery

## Incident Response

### Security Incident Response Plan

1. **Detection and Analysis**
   - Monitor for unusual activities
   - Analyze security logs and alerts
   - Determine scope and impact

2. **Containment**
   - Isolate affected systems
   - Disable compromised accounts
   - Implement temporary security measures

3. **Eradication**
   - Remove malicious code or backdoors
   - Patch vulnerabilities
   - Strengthen security controls

4. **Recovery**
   - Restore systems from backups
   - Monitor for re-infection
   - Validate system integrity

5. **Lessons Learned**
   - Document incident details
   - Update security policies
   - Implement preventive measures

### Emergency Contacts

- **Security Team:** security@company.com
- **IT Operations:** it-ops@company.com
- **Legal Department:** legal@company.com
- **External Security Firm:** security-firm@external.com

## Compliance Considerations

### Data Protection Regulations

If handling personal data, consider:

- **GDPR (Europe):** Right to erasure, data portability, consent management
- **CCPA (California):** Privacy rights, data deletion requests
- **FERPA (Education):** Student privacy protection
- **Local Privacy Laws:** Country-specific regulations

```python
# GDPR compliance - Data deletion
@router.delete("/api/students/{student_id}/gdpr")
async def gdpr_delete_student(
    student_id: int,
    current_user: User = Depends(require_admin)
):
    """GDPR-compliant data deletion"""
    # Log deletion request
    await AuditLogger.log_user_action(
        request, current_user.id, "GDPR_DELETE", "student", student_id
    )

    # Anonymize or delete personal data
    await student_service.gdpr_delete(student_id)

    # Remove from search indexes
    await search_service.remove_from_index(student_id)

    return {"message": "Personal data deleted under GDPR"}
```

## Security Testing

### Penetration Testing Checklist

- [ ] Authentication bypass attempts
- [ ] SQL injection testing
- [ ] XSS vulnerability testing
- [ ] CSRF attack testing
- [ ] File upload vulnerability testing
- [ ] API endpoint security testing
- [ ] Session management testing
- [ ] Access control testing

### Automated Security Scanning

```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Run Bandit security linter
        uses: jpetrucciani/bandit-check@master
        with:
          path: 'backend'

      - name: Run safety check for Python dependencies
        run: |
          pip install safety
          safety check

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

This comprehensive security framework ensures the Student Profiles PWA maintains the highest standards of data protection, access control, and threat prevention.