"""
Tests for guest user database models and operations.

Tests the DBUser model guest-specific functionality and database operations:
- Guest user model field validation
- Guest user database queries
- Guest user data integrity
- Database migration testing for guest fields
- Guest user indexing and performance
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, Boolean, DateTime, create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from src.core.models.models import DBUser, UserRole, Base, get_db


class TestGuestUserModels:
    """Test suite for guest user database models."""

    @pytest.fixture
    def sample_db_user_data(self):
        """Sample DBUser data for testing."""
        return {
            "username": "guest_test123",
            "email": "guest_test123@guest.local",
            "hashed_password": "hashed_password_12345",
            "role": UserRole.STUDENT.value,
            "is_active": True,
            "is_guest": True,
            "guest_token": "test_token_123",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

    @pytest.fixture
    def db_user_instance(self, sample_db_user_data):
        """Create a DBUser instance for testing."""
        return DBUser(**sample_db_user_data)

    def test_db_user_creation(self, sample_db_user_data):
        """Test DBUser model creation with guest fields."""
        # Act
        user = DBUser(**sample_db_user_data)

        # Assert
        assert user.username == sample_db_user_data["username"]
        assert user.email == sample_db_user_data["email"]
        assert user.role == sample_db_user_data["role"]
        assert user.is_active == sample_db_user_data["is_active"]
        assert user.is_guest == sample_db_user_data["is_guest"]
        assert user.guest_token == sample_db_user_data["guest_token"]
        assert user.created_at == sample_db_user_data["created_at"]
        assert user.updated_at == sample_db_user_data["updated_at"]

    def test_db_user_defaults(self):
        """Test DBUser model default values."""
        # Act
        user = DBUser(
            username="test_user",
            email="test@example.com",
            hashed_password="hashed_password",
            role=UserRole.STUDENT.value
        )

        # Assert
        assert user.is_active is True  # Default value
        assert user.is_guest is False  # Default value
        assert user.guest_token is None  # Default value

    def test_db_user_table_name(self):
        """Test DBUser table name configuration."""
        # Assert
        assert DBUser.__tablename__ == "users"

    def test_db_user_columns(self):
        """Test DBUser model columns and their properties."""
        # Assert
        assert hasattr(DBUser, 'id')
        assert hasattr(DBUser, 'username')
        assert hasattr(DBUser, 'email')
        assert hasattr(DBUser, 'hashed_password')
        assert hasattr(DBUser, 'role')
        assert hasattr(DBUser, 'is_active')
        assert hasattr(DBUser, 'is_guest')
        assert hasattr(DBUser, 'guest_token')
        assert hasattr(DBUser, 'expires_at')
        assert hasattr(DBUser, 'created_at')
        assert hasattr(DBUser, 'updated_at')

    def test_db_user_guest_specific_columns(self, db_user_instance):
        """Test guest-specific columns in DBUser model."""
        # Assert
        assert db_user_instance.is_guest is True
        assert db_user_instance.guest_token == "test_token_123"
        assert db_user_instance.expires_at is None  # Not set in test data

    def test_db_user_indexing(self):
        """Test DBUser model indexing configuration."""
        # Test that key columns are indexed for performance
        username_col = DBUser.__table__.columns['username']
        email_col = DBUser.__table__.columns['email']
        role_col = DBUser.__table__.columns['role']
        is_guest_col = DBUser.__table__.columns['is_guest']

        # These should be indexed for guest user queries
        assert username_col.index is True
        assert email_col.index is True
        assert role_col.index is True
        assert is_guest_col.index is True

    def test_db_user_unique_constraints(self):
        """Test DBUser model unique constraints."""
        # Test unique constraints on critical fields
        username_col = DBUser.__table__.columns['username']
        email_col = DBUser.__table__.columns['email']
        guest_token_col = DBUser.__table__.columns['guest_token']

        # These should have unique constraints
        assert username_col.unique is True
        assert email_col.unique is True
        assert guest_token_col.unique is True

    @pytest.mark.asyncio
    async def test_guest_user_database_query(self, sample_db_user_data):
        """Test database query for guest users."""
        # Arrange
        mock_session = AsyncMock(spec=AsyncSession)
        mock_stmt = MagicMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [DBUser(**sample_db_user_data)]

        mock_session.execute = AsyncMock(return_value=mock_result)

        # Act - Simulate guest user query
        from sqlalchemy import select, and_
        stmt = select(DBUser).where(
            and_(
                DBUser.username.like("guest_%"),
                DBUser.is_guest == True
            )
        )
        result = await mock_session.execute(stmt)

        # Assert
        assert mock_session.execute.called
        mock_result.scalars.return_value.all.assert_called_once()

    @pytest.mark.asyncio
    async def test_guest_user_by_username_query(self, sample_db_user_data):
        """Test querying guest user by username pattern."""
        # Arrange
        mock_session = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = DBUser(**sample_db_user_data)

        mock_session.execute = AsyncMock(return_value=mock_result)

        # Act - Simulate guest username query
        from sqlalchemy import select
        stmt = select(DBUser).where(DBUser.username.like("guest_%"))
        result = await mock_session.execute(stmt)

        # Assert
        assert mock_session.execute.called
        mock_result.scalar_one_or_none.assert_called_once()

    def test_db_user_repr(self, db_user_instance):
        """Test DBUser string representation."""
        # Act
        repr_str = repr(db_user_instance)

        # Assert
        assert "DBUser" in repr_str
        assert db_user_instance.username in repr_str

    def test_db_user_equality(self, sample_db_user_data):
        """Test DBUser equality comparison."""
        # Arrange
        user1 = DBUser(**sample_db_user_data)
        user2 = DBUser(**sample_db_user_data)

        # Act & Assert
        assert user1 == user2

    def test_db_user_hash(self, sample_db_user_data):
        """Test DBUser hash functionality."""
        # Arrange
        user = DBUser(**sample_db_user_data)

        # Act & Assert
        assert hash(user) is not None


class TestGuestUserDatabaseOperations:
    """Test suite for guest user database operations."""

    @pytest.fixture
    def in_memory_db(self):
        """Create in-memory SQLite database for testing."""
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=engine)
        return engine

    @pytest.fixture
    def db_session(self, in_memory_db):
        """Create database session for testing."""
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=in_memory_db)
        session = SessionLocal()
        return session

    def test_create_guest_user_in_database(self, db_session, sample_db_user_data):
        """Test creating guest user in actual database."""
        # Act
        guest_user = DBUser(**sample_db_user_data)
        db_session.add(guest_user)
        db_session.commit()
        db_session.refresh(guest_user)

        # Assert
        assert guest_user.id is not None
        assert guest_user.username == sample_db_user_data["username"]
        assert guest_user.is_guest is True
        assert guest_user.guest_token == sample_db_user_data["guest_token"]

    def test_query_guest_users_from_database(self, db_session, sample_db_user_data):
        """Test querying guest users from database."""
        # Arrange
        guest_user = DBUser(**sample_db_user_data)
        db_session.add(guest_user)
        db_session.commit()

        # Act - Query guest users
        from sqlalchemy import select, and_
        stmt = select(DBUser).where(
            and_(
                DBUser.username.like("guest_%"),
                DBUser.is_guest == True
            )
        )
        result = db_session.execute(stmt)
        guests = result.scalars().all()

        # Assert
        assert len(guests) == 1
        assert guests[0].username == sample_db_user_data["username"]
        assert guests[0].is_guest is True

    def test_query_regular_users_excludes_guests(self, db_session, sample_db_user_data):
        """Test that regular user queries exclude guest users."""
        # Arrange
        regular_user_data = sample_db_user_data.copy()
        regular_user_data.update({
            "username": "regular_user",
            "email": "regular@test.com",
            "is_guest": False,
            "guest_token": None
        })

        guest_user = DBUser(**sample_db_user_data)
        regular_user = DBUser(**regular_user_data)

        db_session.add_all([guest_user, regular_user])
        db_session.commit()

        # Act - Query non-guest users
        from sqlalchemy import select
        stmt = select(DBUser).where(DBUser.is_guest == False)
        result = db_session.execute(stmt)
        regular_users = result.scalars().all()

        # Assert
        assert len(regular_users) == 1
        assert regular_users[0].username == "regular_user"
        assert regular_users[0].is_guest is False

    def test_delete_guest_user_from_database(self, db_session, sample_db_user_data):
        """Test deleting guest user from database."""
        # Arrange
        guest_user = DBUser(**sample_db_user_data)
        db_session.add(guest_user)
        db_session.commit()

        # Verify user exists
        from sqlalchemy import select
        stmt = select(DBUser).where(DBUser.id == guest_user.id)
        result = db_session.execute(stmt)
        existing_user = result.scalar_one_or_none()
        assert existing_user is not None

        # Act - Delete guest user
        db_session.delete(guest_user)
        db_session.commit()

        # Assert - Verify user is deleted
        result = db_session.execute(stmt)
        deleted_user = result.scalar_one_or_none()
        assert deleted_user is None

    def test_guest_user_timestamps(self, db_session, sample_db_user_data):
        """Test guest user timestamp handling."""
        # Arrange
        before_creation = datetime.utcnow()

        # Act
        guest_user = DBUser(**sample_db_user_data)
        db_session.add(guest_user)
        db_session.commit()
        db_session.refresh(guest_user)

        after_creation = datetime.utcnow()

        # Assert
        assert guest_user.created_at is not None
        assert guest_user.updated_at is not None
        assert before_creation <= guest_user.created_at <= after_creation
        assert before_creation <= guest_user.updated_at <= after_creation

    @pytest.mark.asyncio
    async def test_update_guest_user_in_database(self, db_session, sample_db_user_data):
        """Test updating guest user in database."""
        # Arrange
        guest_user = DBUser(**sample_db_user_data)
        db_session.add(guest_user)
        db_session.commit()

        original_updated_at = guest_user.updated_at

        # Wait a moment to ensure timestamp difference
        await asyncio.sleep(0.01)

        # Act - Update guest user
        guest_user.guest_token = "updated_token_456"
        db_session.commit()
        db_session.refresh(guest_user)

        # Assert
        assert guest_user.guest_token == "updated_token_456"
        assert guest_user.updated_at > original_updated_at

    def test_bulk_guest_user_operations(self, db_session):
        """Test bulk operations with multiple guest users."""
        # Arrange
        guest_users_data = []
        for i in range(5):
            guest_data = {
                "username": f"guest_test{i}",
                "email": f"guest_test{i}@guest.local",
                "hashed_password": f"hashed_password_{i}",
                "role": UserRole.STUDENT.value,
                "is_active": True,
                "is_guest": True,
                "guest_token": f"token_{i}",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            guest_users_data.append(guest_data)

        # Act - Create multiple guest users
        guest_users = [DBUser(**data) for data in guest_users_data]
        db_session.add_all(guest_users)
        db_session.commit()

        # Assert - Verify all users were created
        from sqlalchemy import select, and_
        stmt = select(DBUser).where(
            and_(
                DBUser.username.like("guest_%"),
                DBUser.is_guest == True
            )
        )
        result = db_session.execute(stmt)
        all_guests = result.scalars().all()

        assert len(all_guests) == 5
        usernames = [user.username for user in all_guests]
        assert all(f"guest_test{i}" in usernames for i in range(5))

    def test_guest_user_unique_constraints_enforcement(self, db_session, sample_db_user_data):
        """Test that unique constraints are enforced for guest users."""
        # Arrange
        guest_user1 = DBUser(**sample_db_user_data)
        guest_user2 = DBUser(**sample_db_user_data)  # Duplicate data

        db_session.add(guest_user1)
        db_session.commit()

        # Act & Assert - Should raise exception for duplicate unique fields
        db_session.add(guest_user2)
        with pytest.raises(Exception):  # Could be IntegrityError or similar
            db_session.commit()


class TestGuestUserMigrations:
    """Test suite for guest user database migrations."""

    def test_db_user_has_guest_fields(self):
        """Test that DBUser model includes guest-specific fields."""
        # Assert that guest-specific columns exist
        assert hasattr(DBUser, 'is_guest')
        assert hasattr(DBUser, 'guest_token')
        assert hasattr(DBUser, 'expires_at')

    def test_db_user_guest_field_types(self):
        """Test guest field data types in DBUser model."""
        # Get column objects
        is_guest_col = DBUser.__table__.columns['is_guest']
        guest_token_col = DBUser.__table__.columns['guest_token']
        expires_at_col = DBUser.__table__.columns['expires_at']

        # Assert correct data types
        assert isinstance(is_guest_col.type, Boolean)
        assert isinstance(guest_token_col.type, String)
        assert isinstance(expires_at_col.type, DateTime)

    def test_db_user_guest_field_defaults(self):
        """Test default values for guest fields."""
        # Create user without specifying guest fields
        user = DBUser(
            username="test_user",
            email="test@example.com",
            hashed_password="hashed_password",
            role=UserRole.STUDENT.value
        )

        # Assert defaults
        assert user.is_guest is False
        assert user.guest_token is None
        assert user.expires_at is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])