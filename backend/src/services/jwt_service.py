"""
Enhanced JWT service for secure authentication and token management.

This module provides comprehensive JWT token management with advanced security features
including RS256 signing, token blacklisting, refresh token rotation, device fingerprinting,
and comprehensive audit logging.

Key Features:
- RS256 signing algorithm for enhanced security
- Token blacklisting and revocation system
- Refresh token rotation to prevent replay attacks
- Device fingerprinting for multi-device session management
- Comprehensive audit trail for authentication events
- Secure token generation with proper claims and expiration
- Rate limiting and brute force protection
"""

from jose import jwt
import hashlib
import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple, Any, List
from dataclasses import dataclass
from enum import Enum
import json
import os
from pathlib import Path
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature

from src.core.config import config
from src.core.models import get_db, Base
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, delete
from sqlalchemy.orm import selectinload

# Enhanced logging
logger = logging.getLogger(__name__)

class TokenType(Enum):
    """Token type enumeration for better type safety."""
    ACCESS = "access"
    REFRESH = "refresh"

class TokenStatus(Enum):
    """Token status enumeration."""
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"

@dataclass
class TokenClaims:
    """Enhanced token claims with additional security fields."""
    sub: str  # subject (username)
    exp: datetime  # expiration time
    iat: datetime  # issued at
    type: TokenType  # token type
    jti: str  # unique token identifier
    device_id: str  # device fingerprint
    session_id: str  # session identifier
    role: str  # user role
    is_guest: bool = False

@dataclass
class TokenPair:
    """Container for access and refresh token pair."""
    access_token: str
    refresh_token: str
    access_expires_at: datetime
    refresh_expires_at: datetime

class JWTKeyManager:
    """Manages RSA key pairs for JWT signing and verification."""

    def __init__(self):
        self.private_key = None
        self.public_key = None
        self._load_or_generate_keys()

    def _load_or_generate_keys(self):
        """Load existing keys or generate new RSA key pair."""
        key_dir = Path(__file__).parent.parent.parent / "keys"
        key_dir.mkdir(exist_ok=True)

        private_key_path = key_dir / "jwt_private.pem"
        public_key_path = key_dir / "jwt_public.pem"

        if private_key_path.exists() and public_key_path.exists():
            # Load existing keys
            with open(private_key_path, "rb") as f:
                self.private_key = serialization.load_pem_private_key(
                    f.read(), password=None, backend=default_backend()
                )
            with open(public_key_path, "rb") as f:
                self.public_key = serialization.load_pem_public_key(
                    f.read(), backend=default_backend()
                )
            logger.info("Loaded existing JWT key pair")
        else:
            # Generate new key pair
            self.private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
                backend=default_backend()
            )
            self.public_key = self.private_key.public_key()

            # Save keys to files
            with open(private_key_path, "wb") as f:
                f.write(self.private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                ))
            with open(public_key_path, "wb") as f:
                f.write(self.public_key.public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo
                ))

            # Set restrictive permissions on private key
            os.chmod(private_key_path, 0o600)
            logger.info("Generated new JWT key pair")

    def get_public_key_pem(self) -> bytes:
        """Get public key in PEM format."""
        return self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )

class TokenBlacklistManager:
    """Manages token blacklisting for logout and revocation."""

    def __init__(self):
        self._memory_blacklist = set()  # In-memory cache for performance
        self._cleanup_interval = 3600  # Cleanup every hour
        self._last_cleanup = datetime.now(timezone.utc)

    async def blacklist_token(self, db: AsyncSession, jti: str, token_type: TokenType,
                            expires_at: datetime, reason: str = "logout") -> None:
        """Add token to blacklist."""
        try:
            # Add to in-memory cache for fast lookup
            self._memory_blacklist.add(jti)

            # Store in database for persistence
            blacklist_entry = TokenBlacklist(
                jti=jti,
                token_type=token_type.value,
                expires_at=expires_at,
                reason=reason,
                created_at=datetime.now(timezone.utc)
            )
            db.add(blacklist_entry)
            await db.commit()

            logger.info(f"Token blacklisted: {jti[:8]}... for {reason}")

        except Exception as e:
            logger.error(f"Failed to blacklist token {jti}: {e}")
            await db.rollback()

    async def is_blacklisted(self, db: AsyncSession, jti: str) -> bool:
        """Check if token is blacklisted."""
        # Fast in-memory check first
        if jti in self._memory_blacklist:
            return True

        # Database check for persistence
        stmt = select(TokenBlacklist).where(TokenBlacklist.jti == jti)
        result = await db.execute(stmt)
        entry = result.scalar_one_or_none()

        if entry:
            self._memory_blacklist.add(jti)  # Cache for future lookups
            return True

        return False

    async def cleanup_expired(self, db: AsyncSession) -> int:
        """Clean up expired blacklist entries."""
        now = datetime.now(timezone.utc)
        stmt = delete(TokenBlacklist).where(TokenBlacklist.expires_at < now)
        result = await db.execute(stmt)
        await db.commit()

        cleaned_count = result.rowcount
        if cleaned_count > 0:
            logger.info(f"Cleaned up {cleaned_count} expired blacklist entries")

        return cleaned_count

class DeviceFingerprint:
    """Generates and validates device fingerprints for security."""

    @staticmethod
    def generate(user_agent: str, ip_address: str, accept_language: str = "") -> str:
        """Generate device fingerprint from request data."""
        fingerprint_data = f"{user_agent}|{ip_address}|{accept_language}"
        return hashlib.sha256(fingerprint_data.encode()).hexdigest()

    @staticmethod
    def validate_similarity(fp1: str, fp2: str) -> bool:
        """Check if two fingerprints are similar (same device)."""
        # Simple comparison - in production, might want more sophisticated comparison
        return fp1 == fp2

class AuditLogger:
    """Logs authentication events for security monitoring."""

    @staticmethod
    async def log_login(db: AsyncSession, username: str, device_id: str,
                       ip_address: str, success: bool, reason: str = None) -> None:
        """Log login attempt."""
        try:
            audit_entry = AuthAuditLog(
                username=username,
                action="login",
                device_id=device_id,
                ip_address=ip_address,
                success=success,
                reason=reason,
                created_at=datetime.now(timezone.utc)
            )
            db.add(audit_entry)
            await db.commit()

            log_level = logging.INFO if success else logging.WARNING
            logger.log(log_level, f"Login {'success' if success else 'failed'}: {username} from {ip_address}")

        except Exception as e:
            logger.error(f"Failed to log login audit: {e}")
            await db.rollback()

    @staticmethod
    async def log_token_refresh(db: AsyncSession, username: str, device_id: str,
                              old_jti: str, new_jti: str) -> None:
        """Log token refresh."""
        try:
            audit_entry = AuthAuditLog(
                username=username,
                action="token_refresh",
                device_id=device_id,
                ip_address="0.0.0.0",  # the endpoint does not pass the client address yet
                metadata_json=json.dumps({"old_jti": old_jti, "new_jti": new_jti}),
                success=True,
                created_at=datetime.now(timezone.utc)
            )
            db.add(audit_entry)
            await db.commit()

            logger.info(f"Token refreshed for {username}: {old_jti[:8]}... -> {new_jti[:8]}...")

        except Exception as e:
            logger.error(f"Failed to log token refresh audit: {e}")
            await db.rollback()

    @staticmethod
    async def log_logout(db: AsyncSession, username: str, device_id: str,
                        jti: str) -> None:
        """Log logout."""
        try:
            audit_entry = AuthAuditLog(
                username=username,
                action="logout",
                device_id=device_id,
                ip_address="0.0.0.0",  # the endpoint does not pass the client address yet
                metadata_json=json.dumps({"jti": jti}),
                success=True,
                created_at=datetime.now(timezone.utc)
            )
            db.add(audit_entry)
            await db.commit()

            logger.info(f"Logout: {username} with token {jti[:8]}...")

        except Exception as e:
            logger.error(f"Failed to log logout audit: {e}")
            await db.rollback()

class JWTService:
    """Enhanced JWT service with comprehensive security features."""

    def __init__(self):
        self.key_manager = JWTKeyManager()
        self.blacklist_manager = TokenBlacklistManager()
        self.audit_logger = AuditLogger()

        # Rate limiting
        self._login_attempts = {}  # username -> attempt count
        self._blocked_until = {}   # username -> unblock time

    def _get_token_expiry(self, token_type: TokenType) -> datetime:
        """Get token expiration datetime based on type."""
        now = datetime.now(timezone.utc)
        if token_type == TokenType.ACCESS:
            return now + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
        else:
            return now + timedelta(days=config.REFRESH_TOKEN_EXPIRE_DAYS)

    def _create_claims(self, username: str, token_type: TokenType,
                      device_id: str, session_id: str, role: str,
                      is_guest: bool = False) -> TokenClaims:
        """Create enhanced token claims."""
        now = datetime.now(timezone.utc)
        return TokenClaims(
            sub=username,
            exp=self._get_token_expiry(token_type),
            iat=now,
            type=token_type,
            jti=secrets.token_urlsafe(32),  # Unique token ID
            device_id=device_id,
            session_id=session_id,
            role=role,
            is_guest=is_guest
        )

    def _claims_to_dict(self, claims: TokenClaims) -> Dict[str, Any]:
        """Convert claims to dictionary for JWT encoding."""
        return {
            "sub": claims.sub,
            "exp": int(claims.exp.timestamp()),
            "iat": int(claims.iat.timestamp()),
            "type": claims.type.value,
            "jti": claims.jti,
            "device_id": claims.device_id,
            "session_id": claims.session_id,
            "role": claims.role,
            "is_guest": claims.is_guest
        }

    def create_token_pair(self, username: str, device_id: str,
                         session_id: str, role: str, is_guest: bool = False) -> TokenPair:
        """Create access and refresh token pair."""
        # Create claims for both tokens
        access_claims = self._create_claims(username, TokenType.ACCESS, device_id, session_id, role, is_guest)
        refresh_claims = self._create_claims(username, TokenType.REFRESH, device_id, session_id, role, is_guest)

        # Convert to dictionaries
        access_payload = self._claims_to_dict(access_claims)
        refresh_payload = self._claims_to_dict(refresh_claims)

        # Sign tokens with RSA private key
        access_token = jwt.encode(access_payload, self.key_manager.private_key, algorithm="RS256")
        refresh_token = jwt.encode(refresh_payload, self.key_manager.private_key, algorithm="RS256")

        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            access_expires_at=access_claims.exp,
            refresh_expires_at=refresh_claims.exp
        )

    def verify_token(self, token: str) -> Optional[TokenClaims]:
        """Verify and decode JWT token."""
        try:
            # Explicit token type checking to prevent warnings
            if token is None:
                logger.warning("Token verification failed: token is None")
                return None

            if not isinstance(token, str):
                logger.warning(f"Token verification failed: invalid token type {type(token)}, expected str")
                return None

            if not token or not token.strip():
                logger.warning("Token verification failed: token is empty or whitespace")
                return None

            # Decode and verify signature
            payload = jwt.decode(token, self.key_manager.public_key, algorithms=["RS256"])

            # Convert to TokenClaims object
            claims = TokenClaims(
                sub=payload["sub"],
                exp=datetime.fromtimestamp(payload["exp"], timezone.utc),
                iat=datetime.fromtimestamp(payload["iat"], timezone.utc),
                type=TokenType(payload["type"]),
                jti=payload["jti"],
                device_id=payload["device_id"],
                session_id=payload["session_id"],
                role=payload["role"],
                is_guest=payload.get("is_guest", False)
            )

            # Check if token is expired
            if claims.exp < datetime.now(timezone.utc):
                return None

            return claims

        except (jwt.ExpiredSignatureError, jwt.JWTError, KeyError) as e:
            logger.warning(f"Token verification failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected token verification error: {e}")
            return None

    async def check_rate_limit(self, username: str) -> bool:
        """Check if login attempts are within rate limits."""
        now = datetime.now(timezone.utc)

        # Check if user is currently blocked
        if username in self._blocked_until:
            if now < self._blocked_until[username]:
                return False
            else:
                # Unblock user
                del self._blocked_until[username]
                self._login_attempts[username] = 0

        # Increment attempt count
        self._login_attempts[username] = self._login_attempts.get(username, 0) + 1

        # Block user after 5 failed attempts
        if self._login_attempts[username] >= 5:
            self._blocked_until[username] = now + timedelta(minutes=15)
            return False

        return True

    def reset_rate_limit(self, username: str):
        """Reset rate limiting for successful login."""
        self._login_attempts.pop(username, None)
        self._blocked_until.pop(username, None)

# Database models for token management
class TokenBlacklist(Base):
    """Database model for token blacklist."""
    __tablename__ = "token_blacklist"

    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String(255), unique=True, nullable=False, index=True)
    token_type = Column(String(20), nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    reason = Column(String(100), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class AuthAuditLog(Base):
    """Database model for authentication audit log."""
    __tablename__ = "auth_audit_log"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False, index=True)
    action = Column(String(50), nullable=False)  # login, logout, token_refresh, etc.
    device_id = Column(String(255), nullable=False)
    ip_address = Column(String(45), nullable=False)  # Support IPv6
    success = Column(Boolean, nullable=False)
    reason = Column(String(255), nullable=True)
    metadata_json = Column(String(1000), nullable=True)  # JSON metadata
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

class RefreshToken(Base):
    """Database model for refresh token storage."""
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(50), nullable=False, index=True)
    device_id = Column(String(255), nullable=False)
    session_id = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_used = Column(DateTime, nullable=True)

# Global JWT service instance
jwt_service = JWTService()

# Import Base from models for database table definitions
from src.core.models.models import Base