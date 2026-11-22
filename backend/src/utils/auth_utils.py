"""
Authentication and authorization utilities for the school management system.

This module provides JWT-based authentication, password hashing, user management,
and role-based access control functionality. It includes utilities for creating
and verifying access tokens, managing user sessions, and enforcing permissions.

Key Features:
- JWT token creation and verification (access and refresh tokens)
- Secure password hashing using bcrypt
- User authentication and authorization
- Role-based permission checking
- FastAPI dependency injection for authenticated endpoints

Security Configuration:
- Access tokens: 15 minutes expiration
- Refresh tokens: 7 days expiration
- Bcrypt password hashing
- HS256 JWT algorithm
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt
import bcrypt
import re
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from dotenv import load_dotenv
from src.core.models import DBUser, get_db, User, UserRole
import os

# JWT Configuration using centralized config
from src.core.config.config import Config

SECRET_KEY = Config.SECRET_KEY
ACCESS_TOKEN_EXPIRE_MINUTES = Config.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = Config.REFRESH_TOKEN_EXPIRE_DAYS
ALGORITHM = "HS256"

# HTTP Bearer for token extraction
security = HTTPBearer()

def is_valid_email(email: str) -> bool:
    """Check if the provided string is a valid email format.

    Args:
        email (str): Email address to validate

    Returns:
        bool: True if valid email format, False otherwise
    """
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_pattern, email) is not None

def is_valid_username(username: str) -> bool:
    """Check if the provided string is a valid username format.

    Args:
        username (str): Username to validate

    Returns:
        bool: True if valid username format, False otherwise
    """
    # Username should be 3-50 characters, alphanumeric with underscores and hyphens
    username_pattern = r'^[a-zA-Z0-9_-]{3,50}$'
    return re.match(username_pattern, username) is not None

def validate_username_or_email_field(username_or_email: str) -> dict:
    """Validate and categorize the username_or_email field.

    Args:
        username_or_email (str): The field value to validate

    Returns:
        dict: Contains 'is_email' (bool) and 'is_valid' (bool)

    Raises:
        HTTPException: If the field format is invalid
    """
    if not username_or_email or not isinstance(username_or_email, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is required"
        )

    # Check if it looks like an email (contains @)
    if '@' in username_or_email:
        is_email = True
        is_valid = is_valid_email(username_or_email)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
    else:
        is_email = False
        is_valid = is_valid_username(username_or_email)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid username format. Must be 3-50 characters, alphanumeric with underscores and hyphens only"
            )

    return {'is_email': is_email, 'is_valid': is_valid}

def hash_password(password: str) -> str:
    """Hash a password using bcrypt for secure storage.

    Args:
        password (str): Plain text password to hash

    Returns:
        str: Bcrypt-hashed password as a UTF-8 string
    """
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its bcrypt hash.

    Args:
        plain_password (str): Plain text password to verify
        hashed_password (str): Bcrypt hash to verify against

    Returns:
        bool: True if password matches hash, False otherwise
    """
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token with expiration.

    Args:
        data (dict): Data to encode in the token (should include 'sub' for subject)
        expires_delta (Optional[timedelta]): Custom expiration time, defaults to 15 minutes

    Returns:
        str: Encoded JWT access token
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return str(encoded_jwt)

def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token with longer expiration.

    Args:
        data (dict): Data to encode in the token (should include 'sub' for subject)

    Returns:
        str: Encoded JWT refresh token with 7-day expiration
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return str(encoded_jwt)

def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
    """Verify and decode a JWT token with improved error handling.

    Args:
        token (str): JWT token to verify and decode
        token_type (str): Expected token type ("access" or "refresh")

    Returns:
        Optional[dict]: Decoded token payload if valid, None if invalid/expired

    Raises:
        jwt.ExpiredSignatureError: If token is expired (caught internally)
        jwt.JWTError: If token is malformed (caught internally)
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != token_type:
            return None
        return payload
    except jwt.ExpiredSignatureError:
        # Token has expired
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTError:
        # Token is invalid/malformed
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:
        # Catch any other JWT-related exceptions
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token validation failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_user_by_username_or_email(db: AsyncSession, username_or_email: str) -> Optional[DBUser]:
    """Retrieve a user from the database by username or email.

    Args:
        db (AsyncSession): Database session for the query
        username_or_email (str): Username or email to search for

    Returns:
        Optional[DBUser]: User object if found, None otherwise
    """
    stmt = select(DBUser).where(
        (DBUser.username == username_or_email) | (DBUser.email == username_or_email)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Extract and validate the current authenticated user from JWT token.

    FastAPI dependency that extracts the JWT token from the Authorization header,
    validates it, and returns the corresponding user information.

    Args:
        credentials (HTTPAuthorizationCredentials): Bearer token from request header
        db (AsyncSession): Database session dependency

    Returns:
        User: Authenticated user information

    Raises:
        HTTPException: If token is invalid, expired, or user doesn't exist/is inactive
    """
    token = credentials.credentials

    # Check if token is blacklisted
    if is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(token, "access")

    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await get_user_by_username_or_email(db, username)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return User(
        id=user.id,
        username=user.username,
        email=user.email,
        role=UserRole(user.role),
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at
    )

async def get_current_user_from_any_source(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User:
    """Extract and validate the current authenticated user from JWT token in either Authorization header or HttpOnly cookie.

    This dependency checks for JWT tokens in multiple sources:
    1. Authorization: Bearer <token> header (for backward compatibility)
    2. access_token HttpOnly cookie (primary method for web clients)

    FastAPI dependency that extracts the JWT token from either source,
    validates it, and returns the corresponding user information.

    Args:
        request (Request): FastAPI request object for cookie access
        db (AsyncSession): Database session dependency

    Returns:
        User: Authenticated user information

    Raises:
        HTTPException: If no valid token found in either source, or if token is invalid/expired/user inactive
    """
    token = None

    # First, try to get token from Authorization header (backward compatibility)
    authorization = request.headers.get("Authorization")
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]

    # If no header token, try to get token from HttpOnly cookie
    if not token:
        token = request.cookies.get("access_token")

    # If no token found in either source, raise authentication error
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if token is blacklisted
    if is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify token format and expiration
    payload = verify_token(token, "access")

    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database
    user = await get_user_by_username_or_email(db, username)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if this is a guest user from the JWT token
    is_guest_from_token = payload.get('is_guest', False)
    guest_token_from_token = payload.get('guest_id')

    return User(
        id=user.id,
        username=user.username,
        email=user.email,
        role=UserRole(user.role),
        is_active=user.is_active,
        is_guest=getattr(user, 'is_guest', False) or is_guest_from_token,  # Check both DB and JWT token
        guest_token=getattr(user, 'guest_token', None) or guest_token_from_token,
        expires_at=getattr(user, 'expires_at', None),
        created_at=user.created_at,
        updated_at=user.updated_at
    )

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure the current user is active and return their information.

    Additional validation dependency that checks if the authenticated user
    account is active before allowing access to protected endpoints.

    Args:
        current_user (User): User object from get_current_user dependency

    Returns:
        User: Active user information

    Raises:
        HTTPException: If user account is inactive
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_active_user_from_any_source(current_user: User = Depends(get_current_user_from_any_source)) -> User:
    """Ensure the current user is active and return their information (supports both header and cookie authentication).

    Additional validation dependency that checks if the authenticated user
    account is active before allowing access to protected endpoints. This version
    supports both Authorization header and HttpOnly cookie authentication methods.

    Args:
        current_user (User): User object from get_current_user_from_any_source dependency

    Returns:
        User: Active user information

    Raises:
        HTTPException: If user account is inactive
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def check_permissions(required_roles: list[UserRole]):
    """Create a FastAPI dependency function for role-based permission checking.

    Returns a dependency function that can be used to restrict endpoint access
    to users with specific roles. The returned function will raise an HTTP 403
    error if the current user doesn't have one of the required roles.

    Args:
        required_roles (list[UserRole]): List of roles that are allowed access

    Returns:
        Callable: FastAPI dependency function for permission checking

    Example:
        app.get("/admin-only", dependencies=[Depends(require_admin)])
    """
    async def permission_checker(current_user: User = Depends(get_current_active_user_from_any_source)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return permission_checker

# Simple in-memory token blacklist (for basic logout functionality)
# In production, consider using Redis or database for persistence
_blacklisted_tokens = set()

def blacklist_token(token: str) -> None:
    """Add a token to the blacklist (for logout).

    Args:
        token (str): JWT token to blacklist
    """
    _blacklisted_tokens.add(token)

def is_token_blacklisted(token: str) -> bool:
    """Check if a token is blacklisted.

    Args:
        token (str): JWT token to check

    Returns:
        bool: True if token is blacklisted, False otherwise
    """
    return token in _blacklisted_tokens

# Permission dependencies for common role combinations
require_admin = check_permissions([UserRole.ADMIN])
require_teacher_or_admin = check_permissions([UserRole.ADMIN, UserRole.TEACHER])
require_any_authenticated = check_permissions(list(UserRole))

# School staff can read school-wide data (students, drivers, reports).
# Students and parents are intentionally excluded: they will get their own
# restricted views later and must not be able to list every student.
STAFF_ROLES = [UserRole.ADMIN, UserRole.TEACHER, UserRole.ACCOUNTANT, UserRole.DRIVER]
require_staff = check_permissions(STAFF_ROLES)

async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Extract and validate the current user from JWT token, returning None if no valid token.

    This function attempts to authenticate a user but doesn't raise an exception if no
    valid authentication is found. Used for endpoints that support both authenticated
    and guest users.

    Args:
        credentials (HTTPAuthorizationCredentials): Bearer token from request header
        db (AsyncSession): Database session dependency

    Returns:
        Optional[User]: Authenticated user information or None if not authenticated
    """
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        # Return None instead of raising exception for optional authentication
        return None

def check_guest_permissions(allowed_permissions: list[str]):
    """Create a FastAPI dependency function for guest user permission checking.

    Returns a dependency function that can be used to restrict endpoint access
    to guest users with specific permissions.

    Args:
        allowed_permissions (list[str]): List of permissions that are allowed for guests

    Returns:
        Callable: FastAPI dependency function for guest permission checking

    Example:
        app.get("/guest-dashboard", dependencies=[Depends(require_guest_dashboard)])
    """
    async def guest_permission_checker(current_user: User = Depends(get_current_active_user)):
        if not getattr(current_user, 'is_guest', False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This endpoint requires guest access"
            )
        return current_user
    return guest_permission_checker

# Guest permission dependencies
require_guest_dashboard = check_guest_permissions(["dashboard:read"])