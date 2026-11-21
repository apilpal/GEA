"""
User management utilities for the school management system.

This module provides utility functions for user creation, management,
and bulk operations. It includes functions for creating users programmatically,
validating user data, and performing administrative tasks.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from core.models.models import DBUser, UserRole, CreateUserRequest, User
from .auth_utils import hash_password, get_user_by_username_or_email

class UserCreationError(Exception):
    """Custom exception for user creation errors."""
    pass

class UserValidationError(Exception):
    """Custom exception for user validation errors."""
    pass

async def create_user(
    db: AsyncSession,
    user_data: CreateUserRequest,
    created_by: Optional[str] = None
) -> User:
    """Create a new user in the database.

    Args:
        db: Database session
        user_data: User creation data
        created_by: Username of the user creating this account (for audit)

    Returns:
        User: Created user information

    Raises:
        UserCreationError: If user creation fails
        UserValidationError: If user data is invalid
    """
    try:
        # Validate user data
        await _validate_user_data(db, user_data)

        # Hash password
        hashed_password = hash_password(user_data.password)

        # Create database user
        db_user = DBUser(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password,
            role=user_data.role,  # Use string directly since role field expects string
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)

        print(f"✅ User created: {user_data.username} ({user_data.role})")

        return User(
            id=db_user.id,
            username=db_user.username,
            email=db_user.email,
            role=UserRole(db_user.role),
            is_active=db_user.is_active,
            created_at=db_user.created_at,
            updated_at=db_user.updated_at
        )

    except Exception as e:
        await db.rollback()
        raise UserCreationError(f"Failed to create user {user_data.username}: {str(e)}")

async def create_users_bulk(
    db: AsyncSession,
    users_data: List[CreateUserRequest],
    created_by: Optional[str] = None
) -> List[User]:
    """Create multiple users in a single transaction.

    Args:
        db: Database session
        users_data: List of user creation data
        created_by: Username of the user creating these accounts

    Returns:
        List[User]: List of created users

    Raises:
        UserCreationError: If bulk creation fails
    """
    created_users = []

    try:
        for user_data in users_data:
            user = await create_user(db, user_data, created_by)
            created_users.append(user)

        print(f"✅ Bulk creation complete: {len(created_users)} users created")
        return created_users

    except Exception as e:
        await db.rollback()
        raise UserCreationError(f"Bulk user creation failed: {str(e)}")

async def _validate_user_data(db: AsyncSession, user_data: CreateUserRequest) -> None:
    """Validate user creation data.

    Args:
        db: Database session
        user_data: User data to validate

    Raises:
        UserValidationError: If validation fails
    """
    # Check username uniqueness
    existing_user = await get_user_by_username_or_email(db, user_data.username)
    if existing_user:
        raise UserValidationError(f"Username '{user_data.username}' already exists")

    # Check email uniqueness
    stmt = select(DBUser).where(DBUser.email == user_data.email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise UserValidationError(f"Email '{user_data.email}' already registered")

    # Validate password strength (basic)
    if len(user_data.password) < 6:
        raise UserValidationError("Password must be at least 6 characters long")

    # Validate role
    if user_data.role not in [role.value for role in UserRole]:
        raise UserValidationError(f"Invalid role: {user_data.role}")

async def get_users_by_role(db: AsyncSession, role: UserRole) -> List[User]:
    """Get all users with a specific role.

    Args:
        db: Database session
        role: Role to filter by

    Returns:
        List[User]: List of users with the specified role
    """
    stmt = select(DBUser).where(DBUser.role == role.value)
    result = await db.execute(stmt)
    db_users = result.scalars().all()

    return [
        User(
            id=user.id,
            username=user.username,
            email=user.email,
            role=UserRole(user.role),
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
        for user in db_users
    ]

async def deactivate_user(db: AsyncSession, username: str) -> bool:
    """Deactivate a user account.

    Args:
        db: Database session
        username: Username to deactivate

    Returns:
        bool: True if user was deactivated, False if not found

    Raises:
        UserCreationError: If deactivation fails
    """
    try:
        user = await get_user_by_username_or_email(db, username)
        if not user:
            return False

        user.is_active = False
        user.updated_at = datetime.utcnow()

        await db.commit()
        print(f"✅ User deactivated: {username}")
        return True

    except Exception as e:
        await db.rollback()
        raise UserCreationError(f"Failed to deactivate user {username}: {str(e)}")

async def activate_user(db: AsyncSession, username: str) -> bool:
    """Activate a user account.

    Args:
        db: Database session
        username: Username to activate

    Returns:
        bool: True if user was activated, False if not found

    Raises:
        UserCreationError: If activation fails
    """
    try:
        user = await get_user_by_username_or_email(db, username)
        if not user:
            return False

        user.is_active = True
        user.updated_at = datetime.utcnow()

        await db.commit()
        print(f"✅ User activated: {username}")
        return True

    except Exception as e:
        await db.rollback()
        raise UserCreationError(f"Failed to activate user {username}: {str(e)}")

async def get_user_count_by_role(db: AsyncSession) -> Dict[str, int]:
    """Get count of users by role.

    Args:
        db: Database session

    Returns:
        Dict[str, int]: Dictionary mapping role names to user counts
    """
    from sqlalchemy import func

    stmt = select(DBUser.role, func.count(DBUser.id)).group_by(DBUser.role)
    result = await db.execute(stmt)

    counts = {}
    for role, count in result:
        counts[role] = count

    # Ensure all roles are present (even with 0 count)
    for role in UserRole:
        if role.value not in counts:
            counts[role.value] = 0

    return counts

def generate_test_user_data(
    base_username: str,
    role: UserRole,
    count: int = 1,
    password: str = "test123"
) -> List[CreateUserRequest]:
    """Generate test user data for bulk creation.

    Args:
        base_username: Base username (will be suffixed with numbers)
        role: Role for all generated users
        count: Number of users to generate
        password: Password for all users

    Returns:
        List[CreateUserRequest]: List of user creation requests
    """
    users = []
    for i in range(1, count + 1):
        username = f"{base_username}{i}"
        email = f"{username}@school.edu"

        users.append(CreateUserRequest(
            username=username,
            email=email,
            password=password,
            role=role
        ))

    return users