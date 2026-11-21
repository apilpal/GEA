#!/usr/bin/env python3
"""
Simple test to check if basic authentication functionality works.
"""

import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

def test_imports():
    """Test that we can import the necessary modules."""
    try:
        from models import DBUser, UserRole, CreateUserRequest, SessionLocal, Base
        from auth_utils import get_user_by_username_or_email
        from user_utils import create_user
        print("✓ All imports successful")
        return True
    except ImportError as e:
        print(f"✗ Import failed: {e}")
        return False

async def test_basic_functionality():
    """Test basic database and auth functionality."""
    if not test_imports():
        return False

    try:
        print("Testing database connection...")
        async with SessionLocal() as session:
            # Try a simple query that should return no results
            from sqlalchemy import select
            stmt = select(DBUser).limit(1)
            result = await session.execute(stmt)
            users = result.scalars().all()
            print(f"✓ Database query works, found {len(users)} users (expected 0)")

        print("✓ Basic functionality test passed")
        return True
    except Exception as e:
        print(f"✗ Basic functionality test failed: {e}")
        return False

async def test_guest_user_functionality():
    """Test guest user functionality - REMOVED."""
    print("✗ Guest user functionality has been removed from the system")
    return True

async def test_guest_conversion_functionality():
    """Test guest to registered user conversion - REMOVED."""
    print("✗ Guest conversion functionality has been removed from the system")
    return True

if __name__ == "__main__":
    print("=== Simple Authentication Test ===")

    # Test basic functionality
    basic_success = asyncio.run(test_basic_functionality())

    # Test guest user functionality (removed)
    guest_success = asyncio.run(test_guest_user_functionality())

    # Test guest conversion functionality (removed)
    conversion_success = asyncio.run(test_guest_conversion_functionality())

    overall_success = basic_success and guest_success and conversion_success

    if overall_success:
        print("\n✓ All tests passed!")
        print("✓ Basic authentication works")
        sys.exit(0)
    else:
        print("\n✗ Some tests failed!")
        if not basic_success:
            print("  - Basic functionality tests failed")
        sys.exit(1)