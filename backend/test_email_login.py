#!/usr/bin/env python3
"""
Test script to specifically test email login functionality.
This script tests both username and email login to identify any issues.
"""

import asyncio
import sys
import os

# Add the backend directory to the path so we can import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from fastapi.testclient import TestClient
    from models import DBUser, UserRole, CreateUserRequest, SessionLocal, Base
    from auth_utils import hash_password, get_user_by_username_or_email
    from user_utils import create_user
    from main import app
    print("Successfully imported all modules")
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)

# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_email_login.db"

async def test_email_login():
    """Test email login functionality specifically."""

    # Create test database tables
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.pool import NullPool

    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=NullPool,
        echo=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        # Create a test user
        async with SessionLocal() as session:
            user_data = CreateUserRequest(
                username="testuser123",
                email="testuser@example.com",
                password="password123",
                role=UserRole.ADMIN
            )

            user = await create_user(session, user_data)
            print(f"Created test user: {user.username}, email: {user.email}")

        # Test the get_user_by_username_or_email function directly
        async with SessionLocal() as session:
            print("\n=== Testing get_user_by_username_or_email function ===")

            # Test with username
            user_by_username = await get_user_by_username_or_email(session, "testuser123")
            print(f"User found by username 'testuser123': {user_by_username is not None}")
            if user_by_username:
                print(f"  Username: {user_by_username.username}")
                print(f"  Email: {user_by_username.email}")
            else:
                print("  ERROR: User not found by username!")

            # Test with email
            user_by_email = await get_user_by_username_or_email(session, "testuser@example.com")
            print(f"User found by email 'testuser@example.com': {user_by_email is not None}")
            if user_by_email:
                print(f"  Username: {user_by_email.username}")
                print(f"  Email: {user_by_email.email}")
            else:
                print("  ERROR: User not found by email!")

            # Test with non-existent data
            user_not_found = await get_user_by_username_or_email(session, "nonexistent")
            print(f"User found by 'nonexistent': {user_not_found is not None}")
            if user_not_found is not None:
                print("  ERROR: Should not find non-existent user!")

        # Test the API endpoints
        print("\n=== Testing API endpoints ===")
        client = TestClient(app)

        # Test login with username
        print("Testing login with username...")
        login_data_username = {
            "username_or_email": "testuser123",
            "password": "password123"
        }
        response = client.post("/auth/login", json=login_data_username)
        print(f"Login with username status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Access token received: {'access_token' in data}")
            print(f"  User data: {data.get('user', {}).get('username', 'N/A')}")
        else:
            print(f"  Error: {response.json()}")

        # Test login with email
        print("\nTesting login with email...")
        login_data_email = {
            "username_or_email": "testuser@example.com",
            "password": "password123"
        }
        response = client.post("/auth/login", json=login_data_email)
        print(f"Login with email status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Access token received: {'access_token' in data}")
            print(f"  User data: {data.get('user', {}).get('username', 'N/A')}")
        else:
            print(f"  Error: {response.json()}")

        # Test login with wrong password
        print("\nTesting login with wrong password...")
        login_data_wrong = {
            "username_or_email": "testuser123",
            "password": "wrongpassword"
        }
        response = client.post("/auth/login", json=login_data_wrong)
        print(f"Login with wrong password status: {response.status_code}")
        if response.status_code != 200:
            print("  Correctly rejected wrong password")

        # Test login with non-existent user
        print("\nTesting login with non-existent user...")
        login_data_nonexistent = {
            "username_or_email": "nonexistent@example.com",
            "password": "password123"
        }
        response = client.post("/auth/login", json=login_data_nonexistent)
        print(f"Login with non-existent user status: {response.status_code}")
        if response.status_code != 200:
            print("  Correctly rejected non-existent user")

    finally:
        # Clean up test database
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)

if __name__ == "__main__":
    asyncio.run(test_email_login())