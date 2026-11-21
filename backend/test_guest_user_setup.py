"""
Test data setup and teardown utilities for guest user tests.

Provides comprehensive setup and cleanup functionality for guest user testing
including database initialization, test data creation, and proper cleanup.
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from src.core.models.models import Base, DBUser, UserRole
from src.utils.auth_utils import hash_password
from .test_guest_user_fixtures import (
    GuestUserTestData,
    GuestUserTestFixtures,
    GuestUserTestFactory
)


class GuestUserTestDatabase:
    """Database utilities for guest user testing."""

    def __init__(self, database_url: str = "sqlite:///:memory:"):
        self.database_url = database_url
        self.engine = None
        self.SessionLocal = None

    async def setup_database(self):
        """Set up test database with tables."""
        # Create async engine for testing
        self.engine = create_async_engine(
            self.database_url.replace("sqlite://", "sqlite+aiosqlite://"),
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

        # Create tables
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Create session factory
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine,
            class_=AsyncSession
        )

    async def teardown_database(self):
        """Clean up test database."""
        if self.engine:
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.drop_all)
            await self.engine.dispose()

    async def get_session(self) -> AsyncSession:
        """Get database session."""
        if not self.SessionLocal:
            await self.setup_database()
        return self.SessionLocal()


class GuestUserTestDataManager:
    """Manages test data creation and cleanup."""

    def __init__(self, db: GuestUserTestDatabase):
        self.db = db
        self.created_users: List[DBUser] = []
        self.created_tokens: List[str] = []

    async def create_test_guest_user(self, guest_id: str = "test123", **kwargs) -> DBUser:
        """Create a test guest user in the database."""
        async with await self.db.get_session() as session:
            user_data = GuestUserTestFactory.create_guest_user_with_custom_data(
                guest_id=guest_id,
                **kwargs
            )

            db_user = DBUser(**user_data)
            session.add(db_user)
            await session.commit()
            await session.refresh(db_user)

            self.created_users.append(db_user)
            return db_user

    async def create_expired_guest_user(self, hours_expired: int = 25) -> DBUser:
        """Create an expired guest user for testing."""
        async with await self.db.get_session() as session:
            expired_data = GuestUserTestFactory.create_guest_user_with_custom_data(
                guest_id="expired",
                username="guest_expired",
                created_at=datetime.now(timezone.utc) - timedelta(hours=hours_expired),
                updated_at=datetime.now(timezone.utc) - timedelta(hours=hours_expired)
            )

            db_user = DBUser(**expired_data)
            session.add(db_user)
            await session.commit()
            await session.refresh(db_user)

            self.created_users.append(db_user)
            return db_user

    async def create_multiple_guest_users(self, count: int) -> List[DBUser]:
        """Create multiple guest users for bulk testing."""
        users = []
        for i in range(count):
            user = await self.create_test_guest_user(f"bulk{i}")
            users.append(user)
        return users

    async def cleanup_test_data(self):
        """Clean up all created test data."""
        if self.created_users:
            async with await self.db.get_session() as session:
                for user in self.created_users:
                    await session.delete(user)
                await session.commit()
                self.created_users.clear()

    async def get_all_guest_users(self) -> List[DBUser]:
        """Get all guest users from database."""
        async with await self.db.get_session() as session:
            from sqlalchemy import select, and_
            stmt = select(DBUser).where(
                and_(
                    DBUser.username.like("guest_%"),
                    DBUser.is_guest == True
                )
            )
            result = await session.execute(stmt)
            return result.scalars().all()


class GuestUserTestEnvironment:
    """Complete test environment for guest user testing."""

    def __init__(self):
        self.database = GuestUserTestDatabase()
        self.data_manager = GuestUserTestDataManager(self.database)

    async def setup(self):
        """Set up complete test environment."""
        await self.database.setup_database()

    async def teardown(self):
        """Clean up complete test environment."""
        await self.data_manager.cleanup_test_data()
        await self.database.teardown_database()

    async def create_clean_environment(self):
        """Create a clean test environment with no data."""
        await self.teardown()
        await self.setup()

    async def populate_with_sample_data(self):
        """Populate environment with sample guest user data."""
        # Create active guest users
        await self.data_manager.create_test_guest_user("active1")
        await self.data_manager.create_test_guest_user("active2")

        # Create expired guest user
        await self.data_manager.create_expired_guest_user(30)  # 30 hours expired

        # Create regular user for comparison
        await self.data_manager.create_test_guest_user(
            "regular_test",
            username="regular_user",
            email="regular@test.com",
            is_guest=False,
            guest_token=None
        )


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def guest_test_db():
    """Fixture for guest user test database."""
    db = GuestUserTestDatabase()
    await db.setup_database()
    yield db
    await db.teardown_database()


@pytest.fixture(scope="function")
async def guest_data_manager(guest_test_db):
    """Fixture for guest user data manager."""
    manager = GuestUserTestDataManager(guest_test_db)
    yield manager
    await manager.cleanup_test_data()


@pytest.fixture(scope="function")
async def guest_test_environment():
    """Fixture for complete guest user test environment."""
    env = GuestUserTestEnvironment()
    await env.setup()
    yield env
    await env.teardown()


@pytest.fixture(scope="function")
async def populated_guest_environment():
    """Fixture for test environment with sample data."""
    env = GuestUserTestEnvironment()
    await env.setup()
    await env.populate_with_sample_data()
    yield env
    await env.teardown()


class GuestUserTestCleanup:
    """Utilities for cleaning up guest user test data."""

    @staticmethod
    async def cleanup_guests_by_pattern(session: AsyncSession, pattern: str = "guest_%"):
        """Clean up guest users by username pattern."""
        from sqlalchemy import select, delete

        # Find guest users matching pattern
        stmt = select(DBUser).where(DBUser.username.like(pattern))
        result = await session.execute(stmt)
        guest_users = result.scalars().all()

        # Delete found users
        if guest_users:
            for user in guest_users:
                await session.delete(user)

            await session.commit()

        return len(guest_users)

    @staticmethod
    async def cleanup_expired_guests(session: AsyncSession, max_age_hours: int = 48):
        """Clean up expired guest users."""
        from sqlalchemy import select, delete, and_
        from datetime import datetime, timezone

        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)

        stmt = select(DBUser).where(
            and_(
                DBUser.username.like("guest_%"),
                DBUser.created_at < cutoff_time
            )
        )
        result = await session.execute(stmt)
        expired_guests = result.scalars().all()

        if expired_guests:
            for guest in expired_guests:
                await session.delete(guest)
            await session.commit()

        return len(expired_guests)

    @staticmethod
    async def reset_user_sequences(session: AsyncSession):
        """Reset database sequences (for PostgreSQL)."""
        try:
            # This is PostgreSQL-specific
            await session.execute("ALTER SEQUENCE users_id_seq RESTART WITH 1")
            await session.commit()
        except Exception:
            # SQLite doesn't need sequence reset
            pass


def pytest_configure(config):
    """Configure pytest for guest user testing."""
    # Add custom markers for guest user tests
    config.addinivalue_line(
        "markers", "guest_user: mark test as guest user specific"
    )
    config.addinivalue_line(
        "markers", "guest_integration: mark test as guest user integration test"
    )
    config.addinivalue_line(
        "markers", "guest_database: mark test as guest user database test"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection for guest user tests."""
    for item in items:
        # Add markers based on test file paths
        if "guest" in str(item.fspath):
            if "integration" in str(item.fspath):
                item.add_marker(pytest.mark.guest_integration)
            elif "test_" in str(item.fspath):
                if "models" in str(item.fspath) or "database" in str(item.fspath):
                    item.add_marker(pytest.mark.guest_database)
                else:
                    item.add_marker(pytest.mark.guest_user)


if __name__ == "__main__":
    # Example usage
    async def main():
        print("Testing GuestUserTestDatabase...")
        db = GuestUserTestDatabase()
        await db.setup_database()

        # Create a test user
        async with await db.get_session() as session:
            user_data = GuestUserTestData.generate_sample_guest_user_data()
            db_user = DBUser(**user_data)
            session.add(db_user)
            await session.commit()

            print(f"Created user: {db_user.username}")

        await db.teardown_database()
        print("Database test completed!")

    asyncio.run(main())