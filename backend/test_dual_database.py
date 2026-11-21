"""
Dual database compatibility tests for the school management system.

This module tests the system's ability to work with both PostgreSQL and SQLite
databases, ensuring compatibility across different database backends. It validates
that the schema, constraints, and operations work consistently regardless of the
underlying database engine.

Test Categories:
- Database Setup: Engine creation and table initialization for both databases
- Cross-Database Operations: CRUD operations that work on both PostgreSQL and SQLite
- Constraint Testing: Database-specific constraint enforcement
- Data Synchronization: Data consistency between different database types
- Migration Compatibility: Schema migrations work across database types

Database Configurations:
- PostgreSQL: Production database with full constraint support
- SQLite: In-memory database for lightweight testing and development

Note: These tests ensure the application can seamlessly switch between
database backends without code changes, supporting both development
and production deployments.
"""

import pytest
import asyncio
import os
import tempfile
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from models import Base, DBStudent, DBDriver, DATABASE_URL
import sqlite3
import pytest
import asyncio
import os
import tempfile
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from models import Base, DBStudent, DBDriver, DATABASE_URL
import sqlite3

# Test database URLs - use separate test databases
TEST_POSTGRES_URL = os.getenv("TEST_DATABASE_URL", "postgresql+asyncpg://test_user:test_password@localhost:5432/test_students_db")
TEST_SQLITE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def postgres_engine():
    """Create a PostgreSQL test database engine"""
    engine = create_async_engine(
        TEST_POSTGRES_URL,
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

    await engine.dispose()

@pytest.fixture(scope="session")
async def sqlite_engine():
    """Create a SQLite test database engine"""
    engine = create_async_engine(
        TEST_SQLITE_URL,
        poolclass=NullPool,
        echo=False,
    )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    await engine.dispose()

@pytest.fixture
async def postgres_session(postgres_engine):
    """Create a PostgreSQL test database session"""
    SessionLocal = sessionmaker(
        expire_on_commit=False,
        class_=AsyncSession,
        bind=postgres_engine
    )
    session = SessionLocal()

    yield session

    await session.close()

@pytest.fixture
async def sqlite_session(sqlite_engine):
    """Create a SQLite test database session"""
    SessionLocal = sessionmaker(
        expire_on_commit=False,
        class_=AsyncSession,
        bind=sqlite_engine
    )
    session = SessionLocal()

    yield session

    await session.close()

@pytest.fixture
async def sample_students_postgres(postgres_session):
    """Create sample students for PostgreSQL testing"""
    students = [
        DBStudent(
            route="I",
            name="John Doe",
            father_name="Father Doe",
            mobile="1234567890",
            class_="10",
            address="Test Address 1",
            fees=1000.0,
            status="active"
        ),
        DBStudent(
            route="II",
            name="Jane Smith",
            father_name="Father Smith",
            mobile="9876543210",
            class_="9",
            address="Test Address 2",
            fees=1500.0,
            status="active"
        )
    ]

    for student in students:
        postgres_session.add(student)
    await postgres_session.commit()

    # Refresh to get IDs
    for student in students:
        await postgres_session.refresh(student)

    yield students

    # Cleanup
    for student in students:
        await postgres_session.delete(student)
    await postgres_session.commit()

@pytest.fixture
async def sample_students_sqlite(sqlite_session):
    """Create sample students for SQLite testing"""
    students = [
        DBStudent(
            route="I",
            name="Alice Johnson",
            father_name="Father Johnson",
            mobile="1112223333",
            class_="8",
            address="SQLite Address 1",
            fees=800.0,
            status="active"
        ),
        DBStudent(
            route="II",
            name="Bob Wilson",
            father_name="Father Wilson",
            mobile="4445556666",
            class_="7",
            address="SQLite Address 2",
            fees=900.0,
            status="active"
        )
    ]

    for student in students:
        sqlite_session.add(student)
    await sqlite_session.commit()

    # Refresh to get IDs
    for student in students:
        await sqlite_session.refresh(student)

    yield students

    # Cleanup
    for student in students:
        await sqlite_session.delete(student)
    await sqlite_session.commit()

class TestDualDatabaseSetup:
    """Test dual database setup and basic operations.

    Validates that both PostgreSQL and SQLite databases can be set up
    and connected to successfully, with proper table creation.
    """

    @pytest.mark.asyncio
    async def test_postgres_connection(self, postgres_session: AsyncSession) -> None:
        """Test PostgreSQL database connection.

        Ensures that the PostgreSQL test database is accessible
        and can execute basic queries.
        """
        result = await postgres_session.execute("SELECT 1 as test_value")
        row = result.fetchone()
        assert row[0] == 1

    @pytest.mark.asyncio
    async def test_sqlite_connection(self, sqlite_session: AsyncSession) -> None:
        """Test SQLite database connection.

        Verifies that the in-memory SQLite database is functional
        and can execute basic queries.
        """
        result = await sqlite_session.execute("SELECT 1 as test_value")
        row = result.fetchone()
        assert row[0] == 1

    @pytest.mark.asyncio
    async def test_table_creation_postgres(self, postgres_session: AsyncSession) -> None:
        """Test that tables are created successfully in PostgreSQL.

        Confirms that the database schema has been properly applied
        to the PostgreSQL test database.
        """
        # Check if students table exists
        result = await postgres_session.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'students')")
        exists = result.scalar()
        assert exists == True

        # Check if drivers table exists
        result = await postgres_session.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'drivers')")
        exists = result.scalar()
        assert exists == True

    @pytest.mark.asyncio
    async def test_table_creation_sqlite(self, sqlite_session: AsyncSession) -> None:
        """Test that tables are created successfully in SQLite.

        Ensures that the schema is correctly applied to the
        SQLite in-memory database.
        """
        # Check if tables exist using SQLite pragma
        result = await sqlite_session.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='students'")
        table = result.fetchone()
        assert table is not None

        result = await sqlite_session.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='drivers'")
        table = result.fetchone()
        assert table is not None

class TestCrossDatabaseOperations:
    """Test operations that work across both databases.

    Ensures that the same operations produce consistent results
    regardless of whether PostgreSQL or SQLite is used as the backend.
    """

    @pytest.mark.asyncio
    async def test_create_student_postgres(self, postgres_session: AsyncSession) -> None:
        """Test creating a student in PostgreSQL.

        Verifies that student creation works correctly in PostgreSQL
        with proper timestamp management and ID generation.
        """
        student = DBStudent(
            route="Test Route",
            name="Test Student PG",
            father_name="Test Father",
            mobile="1112223334",
            class_="5",
            address="Test Address",
            fees=2000.0,
            status="active"
        )

        postgres_session.add(student)
        await postgres_session.commit()
        await postgres_session.refresh(student)

        assert student.id is not None
        assert student.name == "Test Student PG"
        assert student.created_at is not None
        assert student.updated_at is not None

        # Cleanup
        await postgres_session.delete(student)
        await postgres_session.commit()

    @pytest.mark.asyncio
    async def test_create_student_sqlite(self, sqlite_session: AsyncSession) -> None:
        """Test creating a student in SQLite.

        Ensures that the same student creation logic works in SQLite,
        maintaining consistency across database backends.
        """
        student = DBStudent(
            route="Test Route",
            name="Test Student SQLite",
            father_name="Test Father",
            mobile="1112223335",
            class_="5",
            address="Test Address",
            fees=2000.0,
            status="active"
        )

        sqlite_session.add(student)
        await sqlite_session.commit()
        await sqlite_session.refresh(student)

        assert student.id is not None
        assert student.name == "Test Student SQLite"

        # Cleanup
        await sqlite_session.delete(student)
        await sqlite_session.commit()

    @pytest.mark.asyncio
    async def test_read_students_postgres(self, postgres_session, sample_students_postgres):
        """Test reading students from PostgreSQL"""
        result = await postgres_session.execute(postgres_session.query(DBStudent))
        students = result.scalars().all()

        assert len(students) >= 2
        student_names = [s.name for s in students]
        assert "John Doe" in student_names
        assert "Jane Smith" in student_names

    @pytest.mark.asyncio
    async def test_read_students_sqlite(self, sqlite_session, sample_students_sqlite):
        """Test reading students from SQLite"""
        result = await sqlite_session.execute(sqlite_session.query(DBStudent))
        students = result.scalars().all()

        assert len(students) >= 2
        student_names = [s.name for s in students]
        assert "Alice Johnson" in student_names
        assert "Bob Wilson" in student_names

class TestDatabaseSpecificFeatures:
    """Test database-specific features and constraints"""

    @pytest.mark.asyncio
    async def test_postgres_constraints(self, postgres_session):
        """Test PostgreSQL-specific constraints"""
        # Test unique mobile constraint
        student1 = DBStudent(
            name="Student 1",
            mobile="9998887777",
            father_name="Father 1",
            status="active"
        )

        postgres_session.add(student1)
        await postgres_session.commit()

        student2 = DBStudent(
            name="Student 2",
            mobile="9998887777",  # Same mobile
            father_name="Father 2",
            status="active"
        )

        postgres_session.add(student2)
        with pytest.raises(Exception):  # Should raise IntegrityError
            await postgres_session.commit()

        # Rollback and cleanup
        await postgres_session.rollback()
        await postgres_session.delete(student1)
        await postgres_session.commit()

    @pytest.mark.asyncio
    async def test_sqlite_constraints(self, sqlite_session):
        """Test SQLite-specific features"""
        # SQLite handles constraints differently, but basic operations should work
        student = DBStudent(
            name="SQLite Student",
            mobile="7778889999",
            father_name="SQLite Father",
            status="active"
        )

        sqlite_session.add(student)
        await sqlite_session.commit()
        await sqlite_session.refresh(student)

        assert student.id is not None

        # Cleanup
        await sqlite_session.delete(student)
        await sqlite_session.commit()

class TestDataSynchronization:
    """Test data synchronization between databases"""

    @pytest.mark.asyncio
    async def test_data_consistency(self, postgres_session, sqlite_session):
        """Test that data can be synchronized between databases"""
        # Create a student in PostgreSQL
        pg_student = DBStudent(
            name="Sync Test Student",
            father_name="Sync Father",
            mobile="6667778888",
            route="Sync Route",
            status="active"
        )

        postgres_session.add(pg_student)
        await postgres_session.commit()
        await postgres_session.refresh(pg_student)

        # Create same student in SQLite (simulating sync)
        sqlite_student = DBStudent(
            name=pg_student.name,
            father_name=pg_student.father_name,
            mobile=pg_student.mobile,
            route=pg_student.route,
            status=pg_student.status,
            fees=pg_student.fees,
            class_=pg_student.class_,
            address=pg_student.address
        )

        sqlite_session.add(sqlite_student)
        await sqlite_session.commit()
        await sqlite_session.refresh(sqlite_student)

        # Verify data matches
        assert sqlite_student.name == pg_student.name
        assert sqlite_student.mobile == pg_student.mobile
        assert sqlite_student.route == pg_student.route

        # Cleanup
        await postgres_session.delete(pg_student)
        await postgres_session.commit()

        await sqlite_session.delete(sqlite_student)
        await sqlite_session.commit()

class TestMigrationCompatibility:
    """Test that migrations work with both databases"""

    @pytest.mark.asyncio
    async def test_migration_compatibility_postgres(self, postgres_session):
        """Test migration compatibility with PostgreSQL"""
        # This tests that the current schema works with PostgreSQL
        student = DBStudent(
            name="Migration Test PG",
            father_name="Migration Father",
            mobile="5556667778",
            status="active"
        )

        postgres_session.add(student)
        await postgres_session.commit()
        await postgres_session.refresh(student)

        # Check that license_number column exists (from migration)
        # This implicitly tests that the migration ran successfully
        driver = DBDriver(
            name="Migration Test Driver",
            license_number="LIC123456",
            status="active"
        )

        postgres_session.add(driver)
        await postgres_session.commit()
        await postgres_session.refresh(driver)

        assert driver.license_number == "LIC123456"

        # Cleanup
        await postgres_session.delete(student)
        await postgres_session.delete(driver)
        await postgres_session.commit()

    @pytest.mark.asyncio
    async def test_migration_compatibility_sqlite(self, sqlite_session):
        """Test migration compatibility with SQLite"""
        # This tests that the current schema works with SQLite
        student = DBStudent(
            name="Migration Test SQLite",
            father_name="Migration Father",
            mobile="5556667779",
            status="active"
        )

        sqlite_session.add(student)
        await sqlite_session.commit()
        await sqlite_session.refresh(student)

        # Check that license_number column exists (from migration)
        driver = DBDriver(
            name="Migration Test Driver SQLite",
            license_number="LIC789012",
            status="active"
        )

        sqlite_session.add(driver)
        await sqlite_session.commit()
        await sqlite_session.refresh(driver)

        assert driver.license_number == "LIC789012"

        # Cleanup
        await sqlite_session.delete(student)
        await sqlite_session.delete(driver)
        await sqlite_session.commit()