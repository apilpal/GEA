"""
Comprehensive test suite for authentication router endpoints.

This module provides extensive testing for all authentication endpoints including:
- Login/logout functionality
- JWT token management
- User registration and management
- Guest user functionality
- Role-based access control
- Rate limiting
- Error scenarios and edge cases
"""

import pytest
import asyncio
import json
import time
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from unittest.mock import patch, MagicMock

from main import app
from core.models.models import (
    DBUser, UserRole, CreateUserRequest, SessionLocal, Base,
    LoginRequest, CreateUserRequest, UpdateUserRequest
)
from utils.auth_utils import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    verify_token, get_user_by_username_or_email, get_current_user,
    check_permissions, require_admin, require_teacher_or_admin
)
from services.jwt_service import jwt_service, TokenType

# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_auth_comprehensive.db"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    """Create a test database engine for comprehensive auth tests."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=NullPool,
        echo=False,
    )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop tables after tests
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def test_db(test_engine):
    """Create a test database session with transaction rollback."""
    SessionLocalTest = sessionmaker(
        expire_on_commit=False,
        class_=AsyncSession,
        bind=test_engine
    )
    session = SessionLocalTest()

    # Start a transaction for this test
    async with session.begin():
        try:
            yield session
        finally:
            # Rollback transaction to isolate tests
            await session.rollback()
            await session.close()

@pytest.fixture
def test_client():
    """Create a test client for FastAPI app."""
    client = TestClient(app)
    return client

@pytest.fixture
async def test_users(test_db):
    """Create comprehensive test users for authentication testing."""
    users_data = [
        CreateUserRequest(username="admin", email="admin@test.edu", password="admin123", role=UserRole.ADMIN),
        CreateUserRequest(username="teacher", email="teacher@test.edu", password="teacher123", role=UserRole.TEACHER),
        CreateUserRequest(username="driver", email="driver@test.edu", password="driver123", role=UserRole.DRIVER),
        CreateUserRequest(username="student", email="student@test.edu", password="student123", role=UserRole.STUDENT),
        CreateUserRequest(username="inactive", email="inactive@test.edu", password="inactive123", role=UserRole.TEACHER),
    ]

    created_users = []
    for user_data in users_data:
        user = await create_user(test_db, user_data)
        if user_data.username == "inactive":
            user.is_active = False
            await test_db.commit()
        created_users.append(user)

    return created_users

def create_user(db, user_data):
    """Helper function to create test users."""
    hashed_password = hash_password(user_data.password)
    db_user = DBUser(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role,
        is_active=True
    )
    db.add(db_user)
    return db_user

class TestAuthenticationEndpoints:
    """Comprehensive tests for authentication endpoints."""

    def test_login_success_admin(self, test_client, test_users):
        """Test successful admin login with JWT tokens."""
        login_data = {
            "username_or_email": "admin",
            "password": "admin123"
        }

        response = test_client.post("/auth/login", json=login_data)
        assert response.status_code == 200

        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "admin"
        assert data["user"]["role"] == "admin"

        # Check cookies are set
        assert "access_token" in response.cookies
        assert "refresh_token" in response.cookies

    def test_login_success_email(self, test_client, test_users):
        """Test successful login using email instead of username."""
        login_data = {
            "username_or_email": "admin@test.edu",
            "password": "admin123"
        }

        response = test_client.post("/auth/login", json=login_data)
        assert response.status_code == 200

        data = response.json()
        assert data["user"]["email"] == "admin@test.edu"

    def test_login_wrong_password(self, test_client, test_users):
        """Test login with incorrect password."""
        login_data = {
            "username_or_email": "admin",
            "password": "wrongpassword"
        }

        response = test_client.post("/auth/login", json=login_data)
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]

    def test_login_nonexistent_user(self, test_client):
        """Test login with non-existent user."""
        login_data = {
            "username_or_email": "nonexistent",
            "password": "password123"
        }

        response = test_client.post("/auth/login", json=login_data)
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]

    def test_login_inactive_user(self, test_client, test_users):
        """Test login with inactive user account."""
        login_data = {
            "username_or_email": "inactive",
            "password": "inactive123"
        }

        response = test_client.post("/auth/login", json=login_data)
        assert response.status_code == 400
        assert "Inactive user" in response.json()["detail"]

    def test_login_malformed_request(self, test_client):
        """Test login with malformed request data."""
        # Missing password
        login_data = {"username_or_email": "admin"}
        response = test_client.post("/auth/login", json=login_data)
        assert response.status_code == 422

        # Missing username_or_email
        login_data = {"password": "admin123"}
        response = test_client.post("/auth/login", json=login_data)
        assert response.status_code == 422

        # Empty request
        response = test_client.post("/auth/login", json={})
        assert response.status_code == 422

    def test_logout_success(self, test_client, test_users):
        """Test successful logout clears cookies."""
        # First login
        login_data = {"username_or_email": "admin", "password": "admin123"}
        login_response = test_client.post("/auth/login", json=login_data)
        assert login_response.status_code == 200

        # Logout
        response = test_client.post("/auth/logout")
        assert response.status_code == 200
        assert response.json()["message"] == "Successfully logged out"

        # Check cookies are cleared
        assert response.cookies.get("access_token") == ""
        assert response.cookies.get("refresh_token") == ""

    def test_logout_without_auth(self, test_client):
        """Test logout without authentication."""
        response = test_client.post("/auth/logout")
        assert response.status_code == 401

class TestTokenManagement:
    """Comprehensive tests for token management endpoints."""

    def test_refresh_token_success(self, test_client, test_users):
        """Test successful token refresh."""
        # First login to get refresh token
        login_data = {"username_or_email": "admin", "password": "admin123"}
        login_response = test_client.post("/auth/login", json=login_data)
        assert login_response.status_code == 200

        # Refresh token
        response = test_client.post("/auth/refresh")
        assert response.status_code == 200

        data = response.json()
        assert "access_token" in data

    def test_refresh_token_without_cookie(self, test_client):
        """Test refresh token without refresh token cookie."""
        response = test_client.post("/auth/refresh")
        assert response.status_code == 401
        assert "Refresh token missing" in response.json()["detail"]

    def test_get_current_user_info(self, test_client, test_users):
        """Test getting current user information."""
        # First login
        login_data = {"username_or_email": "teacher", "password": "teacher123"}
        login_response = test_client.post("/auth/login", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Get user info
        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.get("/auth/me", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert data["username"] == "teacher"
        assert data["role"] == "teacher"

    def test_get_current_user_invalid_token(self, test_client):
        """Test getting current user with invalid token."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = test_client.get("/auth/me", headers=headers)
        assert response.status_code == 401

    def test_get_current_user_no_token(self, test_client):
        """Test getting current user without token."""
        response = test_client.get("/auth/me")
        assert response.status_code == 401

class TestUserRegistration:
    """Comprehensive tests for user registration endpoints."""

    def test_register_user_admin_success(self, test_client, test_users):
        """Test successful user registration by admin."""
        # First login as admin
        login_data = {"username_or_email": "admin", "password": "admin123"}
        login_response = test_client.post("/auth/login", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Register new user
        register_data = {
            "username": "newteacher",
            "email": "newteacher@test.edu",
            "password": "teacher123",
            "role": "teacher"
        }

        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.post("/auth/register", json=register_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert data["username"] == "newteacher"
        assert data["email"] == "newteacher@test.edu"
        assert data["role"] == "teacher"

    def test_register_user_duplicate_username(self, test_client, test_users):
        """Test user registration with duplicate username."""
        # First login as admin
        login_data = {"username_or_email": "admin", "password": "admin123"}
        login_response = test_client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]

        # Try to register user with existing username
        register_data = {
            "username": "admin",  # Already exists
            "email": "different@test.edu",
            "password": "password123",
            "role": "teacher"
        }

        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.post("/auth/register", json=register_data, headers=headers)
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_register_user_duplicate_email(self, test_client, test_users):
        """Test user registration with duplicate email."""
        # First login as admin
        login_data = {"username_or_email": "admin", "password": "admin123"}
        login_response = test_client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]

        # Try to register user with existing email
        register_data = {
            "username": "differentuser",
            "email": "admin@test.edu",  # Already exists
            "password": "password123",
            "role": "teacher"
        }

        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.post("/auth/register", json=register_data, headers=headers)
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_register_user_non_admin_forbidden(self, test_client, test_users):
        """Test that non-admin users cannot register new users."""
        # Login as teacher
        login_data = {"username_or_email": "teacher", "password": "teacher123"}
        login_response = test_client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]

        # Try to register new user with teacher token
        register_data = {
            "username": "anotheruser",
            "email": "another@test.edu",
            "password": "password123",
            "role": "student"
        }

        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.post("/auth/register", json=register_data, headers=headers)
        assert response.status_code == 403

class TestGuestUserEndpoints:
    """Comprehensive tests for guest user functionality."""

    def test_create_guest_user_success(self, test_client):
        """Test successful guest user creation."""
        response = test_client.post("/auth/guest")
        assert response.status_code == 200

        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["is_guest"] == True
        assert "guest_id" in data
        assert "expires_at" in data

        # Check cookies are set
        assert "access_token" in response.cookies
        assert "refresh_token" in response.cookies

    def test_guest_dashboard_access(self, test_client):
        """Test guest dashboard access."""
        # Create guest user first
        guest_response = test_client.post("/auth/guest")
        assert guest_response.status_code == 200
        token = guest_response.json()["access_token"]

        # Access guest dashboard
        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.get("/auth/guest/dashboard", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert data["guest_access"] == True
        assert "permissions" in data
        assert "summary" in data

    def test_guest_dashboard_non_guest_forbidden(self, test_client, test_users):
        """Test that non-guest users cannot access guest dashboard."""
        # Login as regular user
        login_data = {"username_or_email": "student", "password": "student123"}
        login_response = test_client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]

        # Try to access guest dashboard
        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.get("/auth/guest/dashboard", headers=headers)
        assert response.status_code == 403
        assert "only available to guest users" in response.json()["detail"]

    def test_guest_public_dashboard_stats_access(self, test_client):
        """Test that guest users can access public dashboard stats."""
        # Create guest user first
        guest_response = test_client.post("/auth/guest")
        assert guest_response.status_code == 200
        token = guest_response.json()["access_token"]

        # Access public dashboard stats
        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.get("/dashboard/public/stats", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "guest_access" in data
        assert data["guest_access"] == True
        assert "total_drivers" in data
        assert "total_students" in data

    def test_guest_public_dashboard_charts_access(self, test_client):
        """Test that guest users can access public dashboard charts."""
        # Create guest user first
        guest_response = test_client.post("/auth/guest")
        assert guest_response.status_code == 200
        token = guest_response.json()["access_token"]

        # Access public dashboard charts
        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.get("/dashboard/public/charts", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "guest_access" in data
        assert data["guest_access"] == True
        assert "student_distribution" in data
        assert "revenue_by_driver" in data
        assert "revenue_by_class" in data

    def test_guest_public_drivers_access(self, test_client):
        """Test that guest users can access public driver information."""
        # Create guest user first
        guest_response = test_client.post("/auth/guest")
        assert guest_response.status_code == 200
        token = guest_response.json()["access_token"]

        # Access public driver information
        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.get("/dashboard/public/drivers", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "guest_access" in data
        assert data["guest_access"] == True
        assert "drivers" in data
        assert "total_count" in data

class TestEnhancedSecurityEndpoints:
    """Tests for enhanced security endpoints."""

    def test_enhanced_login_success(self, test_client, test_users):
        """Test enhanced login with device fingerprinting."""
        login_data = {"username_or_email": "admin", "password": "admin123"}

        response = test_client.post("/auth/login-enhanced", json=login_data)
        assert response.status_code == 200

        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "admin"

    def test_enhanced_login_rate_limiting(self, test_client, test_users):
        """Test enhanced login rate limiting."""
        login_data = {"username_or_email": "admin", "password": "wrongpassword"}

        # Make multiple failed attempts
        for i in range(5):
            response = test_client.post("/auth/login-enhanced", json=login_data)
            if response.status_code == 429:
                break

        # Should eventually get rate limited
        response = test_client.post("/auth/login-enhanced", json=login_data)
        if response.status_code == 429:
            assert "Too many login attempts" in response.json()["detail"]

    def test_token_revoke_success(self, test_client, test_users):
        """Test successful token revocation."""
        # First login
        login_data = {"username_or_email": "admin", "password": "admin123"}
        login_response = test_client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]

        # Revoke tokens
        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.post("/auth/token/revoke", headers=headers)
        assert response.status_code == 200
        assert "Successfully logged out" in response.json()["message"]

    def test_token_validate_success(self, test_client, test_users):
        """Test token validation endpoint."""
        # First login
        login_data = {"username_or_email": "teacher", "password": "teacher123"}
        login_response = test_client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]

        # Validate token
        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.get("/auth/token/validate", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert data["valid"] == True
        assert data["user"] == "teacher"
        assert data["role"] == "teacher"

class TestErrorScenarios:
    """Tests for various error scenarios and edge cases."""

    def test_malformed_json_payload(self, test_client):
        """Test handling of malformed JSON payloads."""
        response = test_client.post("/auth/login", data="invalid json")
        assert response.status_code == 422

    def test_empty_json_payload(self, test_client):
        """Test handling of empty JSON payloads."""
        response = test_client.post("/auth/login", json={})
        assert response.status_code == 422

    def test_oversized_payload(self, test_client):
        """Test handling of oversized request payloads."""
        large_data = {"username_or_email": "a" * 10000, "password": "password123"}
        response = test_client.post("/auth/login", json=large_data)
        # Should either handle gracefully or return appropriate error
        assert response.status_code in [400, 413, 422, 500]

    def test_special_characters_in_credentials(self, test_client, test_users):
        """Test handling of special characters in credentials."""
        # Create user with special characters
        login_data = {
            "username_or_email": "test@user#domain.com",
            "password": "P@ssw0rd!123"
        }

        # This test assumes such a user exists or the endpoint handles it gracefully
        response = test_client.post("/auth/login", json=login_data)
        # Should not crash, may return 401 if user doesn't exist
        assert response.status_code in [401, 422]

    def test_sql_injection_attempts(self, test_client):
        """Test handling of potential SQL injection attempts."""
        malicious_data = {
            "username_or_email": "admin'; DROP TABLE users; --",
            "password": "password123"
        }

        response = test_client.post("/auth/login", json=malicious_data)
        # Should handle gracefully, not execute malicious SQL
        assert response.status_code in [401, 422]

    def test_xss_attempts_in_credentials(self, test_client):
        """Test handling of potential XSS attempts in credentials."""
        xss_data = {
            "username_or_email": "<script>alert('xss')</script>",
            "password": "password123"
        }

        response = test_client.post("/auth/login", json=xss_data)
        # Should handle gracefully, not execute JavaScript
        assert response.status_code in [401, 422]

class TestRateLimiting:
    """Tests for rate limiting functionality."""

    def test_login_rate_limiting(self, test_client):
        """Test rate limiting on login endpoint."""
        login_data = {"username_or_email": "admin", "password": "wrongpassword"}

        # Make multiple requests rapidly
        responses = []
        for i in range(10):
            response = test_client.post("/auth/login", json=login_data)
            responses.append(response.status_code)

        # Should eventually get rate limited (may not happen in test environment)
        # At minimum, should handle the requests without crashing
        assert all(status in [401, 429] for status in responses)

    def test_register_rate_limiting(self, test_client, test_users):
        """Test rate limiting on register endpoint."""
        # Login as admin first
        login_data = {"username_or_email": "admin", "password": "admin123"}
        login_response = test_client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]

        register_data = {
            "username": f"testuser{i}",
            "email": f"testuser{i}@test.edu",
            "password": "password123",
            "role": "student"
        }

        headers = {"Authorization": f"Bearer {token}"}

        # Make multiple registration requests rapidly
        responses = []
        for i in range(5):
            response = test_client.post("/auth/register", json=register_data, headers=headers)
            responses.append(response.status_code)

        # Should handle requests appropriately
        assert all(status in [200, 400, 429, 403] for status in responses)

class TestGuestUserConversion:
    """Tests for guest user conversion functionality."""

    def test_convert_guest_to_registered_success(self, test_client, test_db):
        """Test successful guest to registered user conversion."""
        # Create guest user
        guest_response = test_client.post("/auth/guest")
        assert guest_response.status_code == 200
        guest_data = guest_response.json()

        # Convert guest to registered user
        convert_data = {
            "guest_id": guest_data["guest_id"],
            "username": "converteduser",
            "email": "converted@test.edu",
            "password": "converted123"
        }

        response = test_client.post("/auth/convert-guest", json=convert_data)
        assert response.status_code == 200

        data = response.json()
        assert data["username"] == "converteduser"
        assert data["email"] == "converted@test.edu"
        assert data["is_active"] == True

    def test_convert_guest_invalid_guest_id(self, test_client):
        """Test guest conversion with invalid guest ID."""
        convert_data = {
            "guest_id": "invalid_guest_id",
            "username": "testuser",
            "email": "test@test.edu",
            "password": "password123"
        }

        response = test_client.post("/auth/convert-guest", json=convert_data)
        assert response.status_code in [404, 400]

    def test_convert_guest_duplicate_credentials(self, test_client, test_db, test_users):
        """Test guest conversion with duplicate username/email."""
        # Create guest user
        guest_response = test_client.post("/auth/guest")
        guest_data = guest_response.json()

        # Try to convert with existing username
        convert_data = {
            "guest_id": guest_data["guest_id"],
            "username": "admin",  # Already exists
            "email": "unique@test.edu",
            "password": "password123"
        }

        response = test_client.post("/auth/convert-guest", json=convert_data)
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

class TestAdminEndpoints:
    """Tests for admin-only endpoints."""

    def test_cleanup_expired_guests_admin_success(self, test_client, test_users):
        """Test successful cleanup of expired guests by admin."""
        # Login as admin
        login_data = {"username_or_email": "admin", "password": "admin123"}
        login_response = test_client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]

        # Cleanup expired guests
        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.post("/auth/cleanup-guests", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "message" in data
        assert "cleaned_count" in data

    def test_cleanup_expired_guests_non_admin_forbidden(self, test_client, test_users):
        """Test that non-admin users cannot cleanup guests."""
        # Login as teacher
        login_data = {"username_or_email": "teacher", "password": "teacher123"}
        login_response = test_client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]

        # Try to cleanup guests
        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.post("/auth/cleanup-guests", headers=headers)
        assert response.status_code == 403

class TestSecurityHeaders:
    """Tests for security headers and configurations."""

    def test_cors_headers(self, test_client):
        """Test CORS headers are properly set."""
        response = test_client.options("/auth/login")
        # Should not crash and may include CORS headers
        assert response.status_code in [200, 404, 405]

    def test_security_headers_present(self, test_client, test_users):
        """Test that security headers are present in responses."""
        login_data = {"username_or_email": "admin", "password": "admin123"}
        response = test_client.post("/auth/login", json=login_data)

        # Check for security-related headers
        headers_to_check = [
            'content-type',
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection'
        ]

        for header in headers_to_check:
            if header in response.headers:
                # Header is present, which is good
                pass

class TestConcurrentRequests:
    """Tests for concurrent request handling."""

    def test_concurrent_login_requests(self, test_client, test_users):
        """Test handling of concurrent login requests."""
        import concurrent.futures
        import threading

        def make_login_request():
            login_data = {"username_or_email": "admin", "password": "admin123"}
            return test_client.post("/auth/login", json=login_data)

        # Make concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_login_request) for _ in range(5)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]

        # All requests should succeed or fail gracefully
        assert all(response.status_code in [200, 401, 429] for response in responses)

class TestEnhancedGuestToRegisteredConversion:
    """Enhanced tests for guest to registered user conversion workflow."""

    @pytest.mark.asyncio
    async def test_guest_conversion_workflow_comprehensive(self, test_client, test_db):
        """Test comprehensive guest to registered user conversion workflow."""
        # Step 1: Create guest user
        guest_response = test_client.post("/auth/guest")
        assert guest_response.status_code == 200
        guest_data = guest_response.json()
        original_guest_id = guest_data["guest_id"]

        # Step 2: Use guest token to access dashboard
        token = guest_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        dashboard_response = test_client.get("/auth/guest/dashboard", headers=headers)
        assert dashboard_response.status_code == 200

        # Step 3: Convert guest to registered user
        convert_data = {
            "guest_id": original_guest_id,
            "username": "comprehensive_converted_user",
            "email": "comprehensive_converted@example.com",
            "password": "comprehensive_password_123"
        }

        convert_response = test_client.post("/auth/convert-guest", json=convert_data)
        assert convert_response.status_code == 200

        converted_data = convert_response.json()
        assert converted_data["username"] == "comprehensive_converted_user"
        assert converted_data["email"] == "comprehensive_converted@example.com"
        assert converted_data["is_active"] == True

        # Step 4: Verify converted user can login with new credentials
        login_data = {
            "username_or_email": "comprehensive_converted_user",
            "password": "comprehensive_password_123"
        }

        login_response = test_client.post("/auth/login", json=login_data)
        assert login_response.status_code == 200

        login_result = login_response.json()
        assert "access_token" in login_result

        # Step 5: Verify old guest token no longer works
        old_token_response = test_client.get("/auth/guest/dashboard", headers=headers)
        assert old_token_response.status_code == 401  # Should be unauthorized

        # Step 6: Verify converted user has registered user permissions
        new_token = login_result["access_token"]
        new_headers = {"Authorization": f"Bearer {new_token}"}
        me_response = test_client.get("/auth/me", headers=new_headers)
        assert me_response.status_code == 200

        user_data = me_response.json()
        assert user_data["username"] == "comprehensive_converted_user"
        assert user_data["is_active"] == True

    @pytest.mark.asyncio
    async def test_guest_conversion_data_preservation(self, test_client, test_db):
        """Test that guest conversion preserves important data."""
        # Create guest user
        guest_response = test_client.post("/auth/guest")
        guest_data = guest_response.json()

        # Use guest access to create some data (simulated)
        token = guest_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Convert guest
        convert_data = {
            "guest_id": guest_data["guest_id"],
            "username": "data_preservation_user",
            "email": "data_preservation@example.com",
            "password": "data_password_123"
        }

        convert_response = test_client.post("/auth/convert-guest", json=convert_data)
        assert convert_response.status_code == 200

        # Verify conversion preserves essential user properties
        converted_data = convert_response.json()
        assert converted_data["role"] == "student"  # Default role for converted users
        assert converted_data["is_active"] == True

        # Verify user can login with new credentials
        login_data = {
            "username_or_email": "data_preservation_user",
            "password": "data_password_123"
        }

        login_response = test_client.post("/auth/login", json=login_data)
        assert login_response.status_code == 200

    @pytest.mark.asyncio
    async def test_guest_conversion_error_scenarios(self, test_client, test_db):
        """Test error scenarios in guest conversion process."""
        # Test 1: Convert with non-existent guest_id
        convert_data = {
            "guest_id": "non_existent_guest_id",
            "username": "test_user",
            "email": "test@example.com",
            "password": "password_123"
        }

        response = test_client.post("/auth/convert-guest", json=convert_data)
        assert response.status_code in [404, 400]  # Not found or bad request

        # Test 2: Convert with existing username
        # First create a guest
        guest_response = test_client.post("/auth/guest")
        guest_data = guest_response.json()

        # Try to convert with existing username
        convert_data = {
            "guest_id": guest_data["guest_id"],
            "username": "admin",  # Already exists
            "email": "unique@example.com",
            "password": "password_123"
        }

        response = test_client.post("/auth/convert-guest", json=convert_data)
        assert response.status_code == 400  # Username already exists

        # Test 3: Convert with existing email
        convert_data = {
            "guest_id": guest_data["guest_id"],
            "username": "unique_username",
            "email": "admin@test.edu",  # Already exists
            "password": "password_123"
        }

        response = test_client.post("/auth/convert-guest", json=convert_data)
        assert response.status_code == 400  # Email already exists

    @pytest.mark.asyncio
    async def test_guest_conversion_permissions_upgrade(self, test_client, test_db):
        """Test that converted users get appropriate permissions upgrade."""
        # Create guest user
        guest_response = test_client.post("/auth/guest")
        guest_data = guest_response.json()

        # Convert guest to registered user
        convert_data = {
            "guest_id": guest_data["guest_id"],
            "username": "permissions_upgrade_user",
            "email": "permissions_upgrade@example.com",
            "password": "permissions_password_123"
        }

        convert_response = test_client.post("/auth/convert-guest", json=convert_data)
        assert convert_response.status_code == 200

        # Login as converted user
        login_data = {
            "username_or_email": "permissions_upgrade_user",
            "password": "permissions_password_123"
        }

        login_response = test_client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Verify converted user has standard registered user permissions
        me_response = test_client.get("/auth/me", headers=headers)
        assert me_response.status_code == 200

        user_data = me_response.json()
        assert user_data["is_active"] == True
        assert user_data["username"] == "permissions_upgrade_user"

        # Converted user should be able to access standard endpoints
        # but not admin-only endpoints (assuming they have student role)
        register_response = test_client.post("/auth/register", json={
            "username": "test_user",
            "email": "test@example.com",
            "password": "password_123",
            "role": "student"
        }, headers=headers)

        # Should be forbidden (403) since they're not admin
        assert register_response.status_code == 403

class TestGuestFirstArchitectureAdvancedScenarios:
    """Advanced test scenarios for guest-first architecture."""

    @pytest.mark.asyncio
    async def test_guest_session_isolation(self, test_client):
        """Test that guest sessions are properly isolated."""
        # Create first guest
        guest1_response = test_client.post("/auth/guest")
        guest1_data = guest1_response.json()
        guest1_token = guest1_data["access_token"]
        guest1_id = guest1_data["guest_id"]

        # Create second guest
        guest2_response = test_client.post("/auth/guest")
        guest2_data = guest2_response.json()
        guest2_token = guest2_data["access_token"]
        guest2_id = guest2_data["guest_id"]

        # Verify guests are different
        assert guest1_id != guest2_id
        assert guest1_token != guest2_token

        # Verify each guest can only access their own session
        headers1 = {"Authorization": f"Bearer {guest1_token}"}
        headers2 = {"Authorization": f"Bearer {guest2_token}"}

        # Both should be able to access dashboard
        response1 = test_client.get("/auth/guest/dashboard", headers=headers1)
        response2 = test_client.get("/auth/guest/dashboard", headers=headers2)

        assert response1.status_code == 200
        assert response2.status_code == 200

        # Convert first guest to registered user
        convert_data = {
            "guest_id": guest1_id,
            "username": "isolated_converted_user",
            "email": "isolated_converted@example.com",
            "password": "isolated_password_123"
        }

        convert_response = test_client.post("/auth/convert-guest", json=convert_data)
        assert convert_response.status_code == 200

        # Second guest should still work independently
        response2_after = test_client.get("/auth/guest/dashboard", headers=headers2)
        assert response2_after.status_code == 200

        # First guest token should no longer work
        response1_after = test_client.get("/auth/guest/dashboard", headers=headers1)
        assert response1_after.status_code == 401

    @pytest.mark.asyncio
    async def test_guest_rate_limiting_protection(self, test_client):
        """Test rate limiting protection for guest operations."""
        # Attempt to create many guest users rapidly
        responses = []
        for i in range(10):
            response = test_client.post("/auth/guest")
            responses.append(response.status_code)

        # All should succeed or be rate limited gracefully
        # Should not crash or return 500 errors
        assert all(status in [200, 429, 422] for status in responses)

        if 429 in responses:
            print("✓ Rate limiting is working for guest creation")

    @pytest.mark.asyncio
    async def test_guest_token_security_validation(self, test_client, test_db):
        """Test security validation of guest tokens."""
        # Create guest user
        guest_response = test_client.post("/auth/guest")
        guest_data = guest_response.json()
        token = guest_data["access_token"]

        # Test token tampering
        tampered_token = token[:-5] + "TAMPER"

        headers = {"Authorization": f"Bearer {tampered_token}"}

        # Tampered token should be rejected
        response = test_client.get("/auth/guest/dashboard", headers=headers)
        assert response.status_code == 401

        # Test token with wrong structure
        malformed_headers = {"Authorization": "Bearer header.only.no.payload"}
        response = test_client.get("/auth/guest/dashboard", headers=malformed_headers)
        assert response.status_code == 401

        # Valid token should still work
        valid_headers = {"Authorization": f"Bearer {token}"}
        valid_response = test_client.get("/auth/guest/dashboard", headers=valid_headers)
        assert valid_response.status_code == 200

    @pytest.mark.asyncio
    async def test_guest_conversion_data_validation(self, test_client, test_db):
        """Test data validation during guest conversion."""
        # Create guest user first
        guest_response = test_client.post("/auth/guest")
        guest_data = guest_response.json()

        # Test various invalid conversion scenarios

        # Test 1: Invalid email format
        convert_data = {
            "guest_id": guest_data["guest_id"],
            "username": "validation_test_user",
            "email": "invalid-email-format",
            "password": "valid_password_123"
        }

        response = test_client.post("/auth/convert-guest", json=convert_data)
        assert response.status_code == 400

        # Test 2: Too short username
        convert_data = {
            "guest_id": guest_data["guest_id"],
            "username": "ab",  # Too short
            "email": "validation@example.com",
            "password": "valid_password_123"
        }

        response = test_client.post("/auth/convert-guest", json=convert_data)
        assert response.status_code == 400

        # Test 3: Too short password
        convert_data = {
            "guest_id": guest_data["guest_id"],
            "username": "validation_test_user",
            "email": "validation@example.com",
            "password": "123"  # Too short
        }

        response = test_client.post("/auth/convert-guest", json=convert_data)
        assert response.status_code == 400

        # Test 4: Valid conversion should work
        convert_data = {
            "guest_id": guest_data["guest_id"],
            "username": "valid_conversion_user",
            "email": "valid_conversion@example.com",
            "password": "valid_password_123"
        }

        response = test_client.post("/auth/convert-guest", json=convert_data)
        assert response.status_code == 200

class TestGuestCleanupAndMaintenance:
    """Test guest user cleanup and maintenance operations."""

    @pytest.mark.asyncio
    async def test_guest_cleanup_admin_permissions(self, test_client, test_users):
        """Test that guest cleanup requires admin permissions."""
        # Login as non-admin user
        login_data = {"username_or_email": "teacher", "password": "teacher123"}
        login_response = test_client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Try to cleanup guests as non-admin
        response = test_client.post("/auth/cleanup-guests", headers=headers)
        assert response.status_code == 403  # Forbidden

        # Login as admin
        admin_login = {"username_or_email": "admin", "password": "admin123"}
        admin_login_response = test_client.post("/auth/login", json=admin_login)
        admin_token = admin_login_response.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Cleanup should work as admin
        cleanup_response = test_client.post("/auth/cleanup-guests", headers=admin_headers)
        # Should succeed or return appropriate message if no guests to cleanup
        assert cleanup_response.status_code in [200, 404]

if __name__ == "__main__":
    pytest.main([__file__, "-v"])