"""
Test suite for authentication and authorization functionality.

This module tests JWT token creation/validation, user authentication,
role-based access control, and protected endpoints.
"""

import pytest
import asyncio
from datetime import timedelta
from fastapi.testclient import TestClient
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from main import app
from models import DBUser, UserRole, CreateUserRequest, SessionLocal, Base
from auth_utils import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    verify_token, get_user_by_username_or_email, get_current_user,
    check_permissions, require_admin, require_teacher_or_admin
)
from user_utils import create_user
from config import config

# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_auth.db"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    """Create a test database engine for auth tests."""
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
    """Create test users for authentication testing."""
    users_data = [
        CreateUserRequest(username="testadmin", email="admin@test.edu", password="admin123", role=UserRole.ADMIN),
        CreateUserRequest(username="testteacher", email="teacher@test.edu", password="teacher123", role=UserRole.TEACHER),
        CreateUserRequest(username="testdriver", email="driver@test.edu", password="driver123", role=UserRole.DRIVER),
        CreateUserRequest(username="teststudent", email="student@test.edu", password="student123", role=UserRole.STUDENT),
    ]

    created_users = []
    for user_data in users_data:
        user = await create_user(test_db, user_data)
        created_users.append(user)

    return created_users

class TestPasswordUtils:
    """Test password hashing and verification utilities."""

    def test_hash_password(self):
        """Test password hashing creates different hashes for same password."""
        password = "testpassword"
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        # Hashes should be different (due to salt)
        assert hash1 != hash2
        # But both should verify correctly
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)

    def test_verify_password(self):
        """Test password verification works correctly."""
        password = "correctpassword"
        wrong_password = "wrongpassword"
        hashed = hash_password(password)

        assert verify_password(password, hashed)
        assert not verify_password(wrong_password, hashed)

class TestJWTUtils:
    """Test JWT token creation and verification."""

    def test_create_access_token(self):
        """Test access token creation."""
        data = {"sub": "testuser"}
        token = create_access_token(data)

        assert token is not None
        assert isinstance(token, str)

        # Verify token can be decoded
        payload = verify_token(token, "access")
        assert payload["sub"] == "testuser"
        assert payload["type"] == "access"

    def test_create_refresh_token(self):
        """Test refresh token creation."""
        data = {"sub": "testuser"}
        token = create_refresh_token(data)

        assert token is not None
        assert isinstance(token, str)

        # Verify token can be decoded
        payload = verify_token(token, "refresh")
        assert payload["sub"] == "testuser"
        assert payload["type"] == "refresh"

    def test_verify_token_wrong_type(self):
        """Test verifying token with wrong type fails."""
        data = {"sub": "testuser"}
        access_token = create_access_token(data)

        # Try to verify access token as refresh token
        payload = verify_token(access_token, "refresh")
        assert payload is None

    def test_verify_expired_token(self):
        """Test that expired tokens are rejected."""
        data = {"sub": "testuser"}
        expired_token = create_access_token(data, expires_delta=timedelta(seconds=-1))

        with pytest.raises(HTTPException) as exc_info:
            verify_token(expired_token, "access")

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

class TestUserOperations:
    """Test user creation and management operations."""

    @pytest.mark.asyncio
    async def test_create_user_success(self, test_db):
        """Test successful user creation."""
        user_data = CreateUserRequest(
            username="newuser",
            email="newuser@test.edu",
            password="password123",
            role=UserRole.TEACHER
        )

        user = await create_user(test_db, user_data)

        assert user.username == "newuser"
        assert user.email == "newuser@test.edu"
        assert user.role == UserRole.TEACHER
        assert user.is_active == True
        assert user.id is not None

    @pytest.mark.asyncio
    async def test_create_duplicate_username(self, test_db, test_users):
        """Test that duplicate usernames are rejected."""
        from user_utils import UserValidationError

        user_data = CreateUserRequest(
            username="testadmin",  # Already exists
            email="different@test.edu",
            password="password123",
            role=UserRole.TEACHER
        )

        with pytest.raises(UserValidationError) as exc_info:
            await create_user(test_db, user_data)

        assert "already exists" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_create_duplicate_email(self, test_db, test_users):
        """Test that duplicate emails are rejected."""
        from user_utils import UserValidationError

        user_data = CreateUserRequest(
            username="differentuser",
            email="admin@test.edu",  # Already exists
            password="password123",
            role=UserRole.TEACHER
        )

        with pytest.raises(UserValidationError) as exc_info:
            await create_user(test_db, user_data)

        assert "already registered" in str(exc_info.value)

class TestAuthenticationEndpoints:
    """Test authentication API endpoints."""

    @pytest.mark.asyncio
    async def test_login_success(self, test_client, test_users):
        """Test successful user login."""
        login_data = {
            "username_or_email": "testadmin",
            "password": "admin123"
        }

        response = test_client.post("/auth/login", json=login_data)
        assert response.status_code == 200

        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, test_client, test_users):
        """Test login with wrong password fails."""
        login_data = {
            "username_or_email": "testadmin",
            "password": "wrongpassword"
        }

        response = test_client.post("/auth/login", json=login_data)
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, test_client):
        """Test login with nonexistent user fails."""
        login_data = {
            "username_or_email": "nonexistent",
            "password": "password123"
        }

        response = test_client.post("/auth/login", json=login_data)
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_register_user_admin_only(self, test_client, test_users):
        """Test user registration requires admin privileges."""
        # First login as admin to get token
        login_data = {
            "username_or_email": "testadmin",
            "password": "admin123"
        }
        login_response = test_client.post("/auth/login", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Now try to register a new user with admin token
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
        assert data["role"] == "teacher"

    @pytest.mark.asyncio
    async def test_register_user_non_admin_fails(self, test_client, test_users):
        """Test that non-admin users cannot register new users."""
        # Login as teacher
        login_data = {
            "username_or_email": "testteacher",
            "password": "teacher123"
        }
        login_response = test_client.post("/auth/login", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Try to register a new user with teacher token (should fail)
        register_data = {
            "username": "anotheruser",
            "email": "another@test.edu",
            "password": "password123",
            "role": "student"
        }

        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.post("/auth/register", json=register_data, headers=headers)
        assert response.status_code == 403  # Forbidden

class TestRoleBasedPermissions:
    """Test role-based access control."""

    @pytest.mark.asyncio
    async def test_admin_access_protected_endpoint(self, test_client, test_users):
        """Test that admin can access admin-only endpoints."""
        # Login as admin
        login_data = {"username_or_email": "testadmin", "password": "admin123"}
        login_response = test_client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]

        # Try to access admin-only endpoint (register user)
        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.post("/auth/register", json={
            "username": "testuser",
            "email": "testuser@test.edu",
            "password": "password123",
            "role": "student"
        }, headers=headers)

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_teacher_access_teacher_endpoint(self, test_client, test_users):
        """Test that teachers can access teacher-level endpoints."""
        # Login as teacher
        login_data = {"username_or_email": "testteacher", "password": "teacher123"}
        login_response = test_client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]

        # Try to access teacher endpoint (get current user info)
        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.get("/auth/me", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testteacher"
        assert data["role"] == "teacher"

    @pytest.mark.asyncio
    async def test_student_limited_access(self, test_client, test_users):
        """Test that students have limited access."""
        # Login as student
        login_data = {"username_or_email": "teststudent", "password": "student123"}
        login_response = test_client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]

        # Students should be able to access basic endpoints
        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.get("/auth/me", headers=headers)
        assert response.status_code == 200

        # But not admin-only endpoints
        response = test_client.post("/auth/register", json={
            "username": "testuser",
            "email": "testuser@test.edu",
            "password": "password123",
            "role": "student"
        }, headers=headers)
        assert response.status_code == 403  # Forbidden

class TestTokenBlacklisting:
    """Test token blacklisting (logout functionality)."""

    @pytest.mark.asyncio
    async def test_logout_blacklists_token(self, test_client, test_users):
        """Test that logout blacklists the access token."""
        # Login first
        login_data = {"username_or_email": "testadmin", "password": "admin123"}
        login_response = test_client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]

        # Use token to access protected endpoint
        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.get("/auth/me", headers=headers)
        assert response.status_code == 200

        # Logout
        response = test_client.post("/auth/logout", headers=headers)
        assert response.status_code == 200

        # Try to use the same token again (should fail)
        response = test_client.get("/auth/me", headers=headers)
        assert response.status_code == 401


        # Both should be created successfully with different IDs
        assert guest_data1["guest_id"] != guest_data2["guest_id"]
        assert guest_data1["guest_user"].username != guest_data2["guest_user"].username

    @pytest.mark.asyncio
    async def test_guest_malformed_token_handling(self, test_client):
        """Test handling of malformed guest tokens."""
        # Try to access guest dashboard with invalid token
        headers = {"Authorization": "Bearer invalid_token_format"}
        response = test_client.get("/auth/guest/dashboard", headers=headers)
        assert response.status_code == 401

        # Try with completely malformed token
        headers = {"Authorization": "Bearer "}
        response = test_client.get("/auth/guest/dashboard", headers=headers)
        assert response.status_code == 401

if __name__ == "__main__":
    pytest.main([__file__, "-v"])