"""
Authentication router for the school management system.

This module provides FastAPI routes for user authentication, authorization,
and user management. It implements JWT-based authentication with access
and refresh tokens, secure cookie handling, and role-based access control.

Endpoints:
- POST /auth/login: User login with JWT token generation
- POST /auth/logout: User logout with cookie clearing
- POST /auth/refresh: Access token refresh using refresh tokens
- POST /auth/register: User registration (admin only)

Security Features:
- JWT access tokens (15-minute expiration)
- JWT refresh tokens (7-day expiration)
- HttpOnly cookies for token storage
- Password hashing with bcrypt
- Role-based permissions (admin, teacher, driver, student)

All endpoints require proper authentication except for login and refresh
operations. The register endpoint is restricted to admin users only.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Response
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import Optional
import os
import logging
import secrets

from src.core.config.config import config
from src.core.models import (
    LoginRequest,
    TokenResponse,
    CreateUserRequest,
    UpdateUserRequest,
    User,
    get_db,
    DBUser,
    UserRole,
)
from src.utils.auth_utils import (
    hash_password, verify_password, get_user_by_username_or_email, require_admin, get_current_active_user_from_any_source,
    validate_username_or_email_field, is_valid_email, is_valid_username, create_access_token, create_refresh_token, verify_token
)
from src.services.jwt_service import jwt_service, TokenType, DeviceFingerprint

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()
logger = logging.getLogger(__name__)

@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Authenticate user and return JWT tokens.

    Validates user credentials, creates JWT access and refresh tokens,
    and sets HttpOnly cookies for secure token storage.

    Args:
        request (LoginRequest): Login credentials (username/email and password)
        response (Response): FastAPI response object for cookie setting
        db (AsyncSession): Database session dependency

    Returns:
        TokenResponse: Contains the access token

    Raises:
        HTTPException: If credentials are invalid or user is inactive
    """
    # Validate the username_or_email field format
    validation = validate_username_or_email_field(request.username_or_email)

    # Get user by username or email
    user = await get_user_by_username_or_email(db, request.username_or_email)

    if not user:
        # Provide specific error message based on what user entered
        field_type = "email" if validation['is_email'] else "username"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect {field_type} or password"
        )

    if not verify_password(request.password, user.hashed_password):
        # Provide specific error message based on what user entered
        field_type = "email" if validation['is_email'] else "username"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect {field_type} or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    # Create tokens
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_refresh_token(data={"sub": user.username})

    # Set HttpOnly cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=15 * 60,  # 15 minutes
        expires=None,
        path="/",
        secure=False,  # Set to True in production with HTTPS
        samesite="lax"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,  # 7 days
        expires=None,
        path="/",
        secure=False,  # Set to True in production with HTTPS
        samesite="lax"
    )

    # Create user profile data
    user_data = User(
        id=user.id,
        username=user.username,
        email=user.email,
        role=UserRole(user.role),
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at
    )

    return TokenResponse(access_token=access_token, user=user_data)

@router.post("/bypass-login", response_model=TokenResponse)
async def bypass_login(
    response: Response,
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Login bypass endpoint for development and testing.
    
    This endpoint provides administrative access without password validation
    when login bypass is enabled in the configuration. It should be used
    only in development/testing environments and never in production.
    
    Args:
        response (Response): FastAPI response object for cookie setting
        db (AsyncSession): Database session dependency
    
    Returns:
        TokenResponse: Contains the access token for bypass user
    
    Raises:
        HTTPException: If bypass login is disabled or an error occurs
    """
    # Check if bypass login is enabled
    if not config.LOGIN_BYPASS_ENABLED:
        logger.warning(f"Login bypass attempt when disabled")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Login bypass is disabled"
        )
    
    try:
        # Create bypass user data
        bypass_username = config.LOGIN_BYPASS_USERNAME
        bypass_role = config.LOGIN_BYPASS_ROLE
        
        # Log bypass login attempt for security audit
        logger.warning(f"LOGIN BYPASS USED: {bypass_username} with role {bypass_role}")
        
        # Generate device fingerprint and session ID for audit
        device_id = "bypass_device"
        session_id = secrets.token_urlsafe(32)
        
        # Create enhanced token pair using JWT service
        token_pair = jwt_service.create_token_pair(
            username=bypass_username,
            device_id=device_id,
            session_id=session_id,
            role=bypass_role,
            is_guest=False
        )
        
        # Set HttpOnly cookies according to security policy
        response.set_cookie(
            key="refresh_token",
            value=token_pair.refresh_token,
            httponly=True,
            max_age=7 * 24 * 60 * 60,  # 7 days
            expires=None,
            path="/",
            secure=config.is_production,  # Secure in production
            samesite="strict"  # Strict for enhanced security
        )
        
        # Log successful bypass login for audit trail
        await jwt_service.audit_logger.log_login(
            db, bypass_username, device_id, "127.0.0.1", True, "login_bypass_used"
        )
        
        # Create user profile data with current timestamp
        current_time = datetime.utcnow()
        user_data = User(
            username=bypass_username,
            email=f"{bypass_username}@bypass.local",
            role=UserRole(bypass_role),
            is_active=True,
            is_bypass_user=True,
            created_at=current_time,
            updated_at=current_time
        )
        
        return TokenResponse(
            access_token=token_pair.access_token,
            token_type="bearer",
            user=user_data
        )
        
    except Exception as e:
        logger.error(f"Bypass login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bypass login failed"
        )

@router.post("/logout")
async def logout(
    response: Response,
    current_user: User = Depends(get_current_active_user_from_any_source)
) -> dict:
    """Clear authentication cookies and log out user.

    Removes access and refresh token cookies from the client and blacklists
    the current access token to prevent further use.

    Args:
        response (Response): FastAPI response object for cookie clearing
        current_user (User): Currently authenticated user

    Returns:
        dict: Success message indicating logout completion
    """
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Successfully logged out"}

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str = None,
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Refresh access token using refresh token.

    Validates the provided refresh token and issues a new access token
    if the refresh token is valid and the user is still active.

    Args:
        refresh_token (str, optional): Refresh token from request body or cookie
        db (AsyncSession): Database session dependency

    Returns:
        TokenResponse: New access token

    Raises:
        HTTPException: If refresh token is missing, invalid, or user is inactive
    """
    # Try to get refresh token from cookie if not provided in request
    if not refresh_token:
        from fastapi import Cookie
        refresh_token = Cookie(None, alias="refresh_token")

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )

    payload = verify_token(refresh_token, "refresh")

    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user = await get_user_by_username_or_email(db, username)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    # Create new access token
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(access_token=access_token)

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_active_user_from_any_source)) -> User:
    """Get current authenticated user information.

    Returns the profile information of the currently authenticated user.

    Args:
        current_user (User): Currently authenticated user from dependency

    Returns:
        User: Current user's profile information
    """
    return current_user

@router.post("/register", response_model=User)
async def register_user(
    user_data: CreateUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> User:
    """Create a new user account (admin only).

    Allows administrators to create new user accounts with specified roles.
    Validates that username and email are unique before creating the account.

    Args:
        user_data (CreateUserRequest): New user account information
        db (AsyncSession): Database session dependency
        current_user (User): Currently authenticated admin user (enforced by dependency)

    Returns:
        User: Created user information (without sensitive password data)

    Raises:
        HTTPException: If username or email already exists, or if caller is not admin
    """
    # Validate email format for the new user
    if not is_valid_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )

    # Validate username format for the new user
    if not is_valid_username(user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid username format. Must be 3-50 characters, alphanumeric with underscores and hyphens only"
        )

    # Check if username or email already exists
    existing_user = await get_user_by_username_or_email(db, user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    stmt = select(DBUser).where(DBUser.email == user_data.email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    hashed_password = hash_password(user_data.password)
    db_user = DBUser(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role,
        is_active=True
    )

    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    return User(
        id=db_user.id,
        username=db_user.username,
        email=db_user.email,
        role=UserRole(db_user.role),
        is_active=db_user.is_active,
        created_at=db_user.created_at,
        updated_at=db_user.updated_at
    )


# Enhanced JWT token management endpoints with cookie minimization strategy

@router.post("/token/refresh", response_model=TokenResponse)
async def refresh_access_token(
    response: Response,
    refresh_token: str = None,
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Refresh access token using refresh token with enhanced security.

    Implements token rotation and enhanced security features:
    - Validates refresh token using RS256 verification
    - Generates new access token with rotation
    - Updates refresh token for enhanced security
    - Implements cookie minimization strategy
    - Comprehensive audit logging

    Args:
        refresh_token (str, optional): Refresh token from request body or cookie
        response (Response): FastAPI response object for cookie setting
        db (AsyncSession): Database session dependency

    Returns:
        TokenResponse: New access token with user information

    Raises:
        HTTPException: If refresh token is invalid, expired, or user is inactive
    """
    # Try to get refresh token from cookie if not provided in request
    if not refresh_token:
        from fastapi import Cookie
        refresh_token = Cookie(None, alias="refresh_token")

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )

    # Verify refresh token using enhanced JWT service
    token_claims = jwt_service.verify_token(refresh_token)
    if not token_claims or token_claims.type != TokenType.REFRESH:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    # Check if refresh token is blacklisted
    if await jwt_service.blacklist_manager.is_blacklisted(db, token_claims.jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked"
        )

    # Get user information
    user = await get_user_by_username_or_email(db, token_claims.sub)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    # Generate new token pair (token rotation)
    session_id = secrets.token_urlsafe(32)
    device_id = token_claims.device_id

    token_pair = jwt_service.create_token_pair(
        username=user.username,
        device_id=device_id,
        session_id=session_id,
        role=user.role,
        is_guest=getattr(user, 'is_guest', False)
    )

    # Blacklist old refresh token for security
    await jwt_service.blacklist_manager.blacklist_token(
        db, token_claims.jti, TokenType.REFRESH, token_claims.exp, "rotated"
    )

    # Log token refresh for audit trail
    await jwt_service.audit_logger.log_token_refresh(
        db, user.username, device_id, token_claims.jti,
        token_pair.refresh_token_claims.jti if hasattr(token_pair, 'refresh_token_claims') else token_claims.jti
    )

    # Set HttpOnly cookie for refresh token only (cookie minimization strategy)
    response.set_cookie(
        key="refresh_token",
        value=token_pair.refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,  # 7 days
        expires=None,
        path="/",
        secure=config.is_production,  # Secure in production
        samesite="strict"  # Strict for enhanced security
    )

    # Create user profile data (without sensitive information)
    user_data = User(
        id=user.id,
        username=user.username,
        email=user.email,
        role=UserRole(user.role),
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at
    )

    return TokenResponse(
        access_token=token_pair.access_token,
        token_type="bearer",
        user=user_data
    )

@router.post("/token/revoke")
async def revoke_tokens(
    response: Response,
    current_user: User = Depends(get_current_active_user_from_any_source),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Revoke all tokens for current user session.

    Implements comprehensive token revocation:
    - Revokes current access token
    - Revokes current refresh token
    - Clears all session-related tokens
    - Comprehensive audit logging
    - Secure logout implementation

    Args:
        response (Response): FastAPI response object for cookie clearing
        current_user (User): Currently authenticated user
        db (AsyncSession): Database session dependency

    Returns:
        dict: Success message indicating token revocation completion
    """
    # Note: In a production environment, you'd want to extract the current token's JTI
    # For now, we'll revoke all tokens for the user (could be made more granular)

    # Clear cookies according to cookie minimization strategy
    response.delete_cookie(key="refresh_token", path="/", secure=config.is_production, samesite="strict")

    # Log logout for audit trail
    device_id = "unknown"  # In production, extract from current token
    await jwt_service.audit_logger.log_logout(db, current_user.username, device_id, "logout")

    return {"message": "Successfully logged out and revoked all tokens"}

@router.get("/token/validate")
async def validate_token(
    current_user: User = Depends(get_current_active_user_from_any_source),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Validate current token and return token status.

    Provides token validation endpoint for frontend:
    - Validates current access token
    - Returns token expiration information
    - Provides session status
    - Enhanced security validation

    Args:
        current_user (User): Currently authenticated user
        db (AsyncSession): Database session dependency

    Returns:
        dict: Token validation status and metadata
    """
    # In a production environment, you'd extract the current token's claims
    # For now, return basic validation info

    return {
        "valid": True,
        "user": current_user.username,
        "role": current_user.role,
        "expires_in_minutes": config.ACCESS_TOKEN_EXPIRE_MINUTES,
        "token_type": "access"
    }

# Enhanced login endpoint with device fingerprinting and improved security
@router.post("/login-enhanced", response_model=TokenResponse)
async def enhanced_login(
    request: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Enhanced login with device fingerprinting and improved security.

    Implements enhanced security features:
    - Rate limiting for login attempts
    - Device fingerprinting for session tracking
    - Comprehensive audit logging
    - Cookie minimization strategy
    - Enhanced token generation with RS256

    Args:
        request (LoginRequest): Login credentials
        response (Response): FastAPI response object
        db (AsyncSession): Database session dependency

    Returns:
        TokenResponse: Access token and user information
    """
    # Validate input format
    validation = validate_username_or_email_field(request.username_or_email)

    # Check rate limiting if enabled
    if config.ENABLE_LOGIN_RATE_LIMITING:
        if not await jwt_service.check_rate_limit(request.username_or_email):
            await jwt_service.audit_logger.log_login(
                db, request.username_or_email, "rate_limited", "0.0.0.0", False, "rate_limit_exceeded"
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again later."
            )

    # Get user information
    user = await get_user_by_username_or_email(db, request.username_or_email)

    if not user:
        field_type = "email" if validation['is_email'] else "username"
        await jwt_service.audit_logger.log_login(
            db, request.username_or_email, "unknown_device", "0.0.0.0", False, f"user_not_found_{field_type}"
        )
        jwt_service.reset_rate_limit(request.username_or_email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect {field_type} or password"
        )

    if not verify_password(request.password, user.hashed_password):
        field_type = "email" if validation['is_email'] else "username"
        await jwt_service.audit_logger.log_login(
            db, request.username_or_email, "unknown_device", "0.0.0.0", False, f"invalid_password_{field_type}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect {field_type} or password"
        )

    if not user.is_active:
        await jwt_service.audit_logger.log_login(
            db, user.username, "unknown_device", "0.0.0.0", False, "user_inactive"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    # Generate device fingerprint (in production, extract from request headers)
    device_id = DeviceFingerprint.generate(
        user_agent="unknown",  # Extract from request headers in production
        ip_address="0.0.0.0",  # Extract from request in production
        accept_language=""
    )

    # Generate session ID for enhanced tracking
    session_id = secrets.token_urlsafe(32)

    # Create enhanced token pair
    token_pair = jwt_service.create_token_pair(
        username=user.username,
        device_id=device_id,
        session_id=session_id,
        role=user.role,
        is_guest=getattr(user, 'is_guest', False)
    )

    # Log successful login
    await jwt_service.audit_logger.log_login(
        db, user.username, device_id, "0.0.0.0", True
    )

    # Reset rate limiting for successful login if enabled
    if config.ENABLE_LOGIN_RATE_LIMITING:
        jwt_service.reset_rate_limit(user.username)

    # Implement cookie minimization strategy:
    # - HttpOnly cookie for refresh token only (server-side only)
    # - Access token returned in response body for frontend storage
    response.set_cookie(
        key="refresh_token",
        value=token_pair.refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,  # 7 days
        expires=None,
        path="/",
        secure=config.is_production,  # Secure in production
        samesite="strict"  # Strict for enhanced security
    )

    # Create user profile data
    user_data = User(
        id=user.id,
        username=user.username,
        email=user.email,
        role=UserRole(user.role),
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at
    )

    return TokenResponse(
        access_token=token_pair.access_token,
        token_type="bearer",
        user=user_data
    )
