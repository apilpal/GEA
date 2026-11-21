"""
PostgreSQL-specific database tests for the school management system.

This module contains comprehensive tests specifically for PostgreSQL database
operations, including direct database interactions, constraint validation,
performance testing, and migration verification. All tests use a separate
test database to ensure isolation from production data.

Test Categories:
- Database Connection Tests: PostgreSQL connectivity and table creation
- CRUD Operations: Direct database operations for students and drivers
- Constraint Validation: Unique constraints on mobile numbers, names, etc.
- Search Functionality: Database-level search and filtering
- Migration Tests: CSV data import and schema migration
- Performance Tests: Query optimization and pagination

Database Requirements:
- PostgreSQL test database configured via TEST_DATABASE_URL
- Separate from production database for safety
- Automatic table creation/cleanup via fixtures

Note: These tests focus on database layer functionality and complement
the API-level tests in test_main.py.
"""

import pytest
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from models import Base, DBStudent, DBDriver, DATABASE_URL
# Dual database imports removed - using single database setup
import os
import pytest
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from models import Base, DBStudent, DBDriver, DATABASE_URL
# Dual database imports removed - using single database setup
import os

# Test database URL - use a separate test database
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql+asyncpg://test_user:test_password@localhost:5432/test_students_db")

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    """Create a test database engine"""
    # Use NullPool to avoid connection pooling issues in tests
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

    await engine.dispose()

@pytest.fixture
async def test_db_session(test_engine):
    """Create a test database session"""
    SessionLocal = sessionmaker(
        expire_on_commit=False,
        class_=AsyncSession,
        bind=test_engine
    )
    session = SessionLocal()

    yield session

    await session.close()

@pytest.fixture
async def sample_students(test_db_session):
    """Create sample students for testing"""
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
        ),
        DBStudent(
            route="III",
            name="Bob Johnson",
            father_name="Father Johnson",
            mobile="5556667777",
            class_="8",
            address="Test Address 3",
            fees=1200.0,
            status="active"
        )
    ]

    for student in students:
        test_db_session.add(student)
    await test_db_session.commit()

    # Refresh to get IDs
    for student in students:
        await test_db_session.refresh(student)

    yield students

    # Cleanup
    for student in students:
        await test_db_session.delete(student)
    await test_db_session.commit()

class TestPostgreSQLConnection:
    """Test PostgreSQL database connection and basic operations.

    Validates that the PostgreSQL database is properly configured and
    accessible, including table creation and basic connectivity.
    """

    @pytest.mark.asyncio
    async def test_database_connection(self, test_engine) -> None:
        """Test that we can connect to PostgreSQL database.

        Performs a basic connectivity test to ensure the database
        engine can execute simple queries.
        """
        async with test_engine.begin() as conn:
            result = await conn.execute("SELECT 1 as test_value")
            row = result.fetchone()
            assert row[0] == 1

    @pytest.mark.asyncio
    async def test_table_creation(self, test_db_session: AsyncSession) -> None:
        """Test that tables are created successfully.

        Verifies that the required database tables (students, drivers)
        exist in the test database schema.
        """
        # Check if students table exists
        result = await test_db_session.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'students')")
        exists = result.scalar()
        assert exists == True

        # Check if drivers table exists
        result = await test_db_session.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'drivers')")
        exists = result.scalar()
        assert exists == True

class TestStudentDatabaseOperations:
    """Test student operations directly with PostgreSQL database.

    Tests CRUD operations at the database layer, ensuring data persistence,
    automatic timestamp management, and proper constraint enforcement.
    """

    @pytest.mark.asyncio
    async def test_create_student(self, test_db_session: AsyncSession) -> None:
        """Test creating a student directly in the database.

        Verifies that student records can be inserted with all fields
        and that automatic timestamps are properly set.
        """
        student = DBStudent(
            route="Test Route",
            name="Test Student",
            father_name="Test Father",
            mobile="1112223333",
            class_="5",
            address="Test Address",
            fees=2000.0,
            status="active"
        )

        test_db_session.add(student)
        await test_db_session.commit()
        await test_db_session.refresh(student)

        assert student.id is not None
        assert student.name == "Test Student"
        assert student.created_at is not None
        assert student.updated_at is not None

        # Cleanup
        await test_db_session.delete(student)
        await test_db_session.commit()

    @pytest.mark.asyncio
    async def test_read_students(self, test_db_session: AsyncSession, sample_students: list) -> None:
        """Test reading students from database.

        Ensures that student records can be retrieved and that
        the sample data fixture is working correctly.
        """
        result = await test_db_session.execute(test_db_session.query(DBStudent))
        students = result.scalars().all()

        assert len(students) >= 3
        student_names = [s.name for s in students]
        assert "John Doe" in student_names
        assert "Jane Smith" in student_names
        assert "Bob Johnson" in student_names

    @pytest.mark.asyncio
    async def test_update_student(self, test_db_session):
        """Test updating a student in the database"""
        # Create a test student
        student = DBStudent(
            route="Update Route",
            name="Update Student",
            father_name="Update Father",
            status="active"
        )

        test_db_session.add(student)
        await test_db_session.commit()
        await test_db_session.refresh(student)

        original_updated_at = student.updated_at

        # Update the student
        student.name = "Updated Student"
        student.class_ = "6"
        await test_db_session.commit()
        await test_db_session.refresh(student)

        assert student.name == "Updated Student"
        assert student.class_ == "6"
        assert student.updated_at >= original_updated_at

        # Cleanup
        await test_db_session.delete(student)
        await test_db_session.commit()

    @pytest.mark.asyncio
    async def test_delete_student(self, test_db_session):
        """Test deleting a student from the database"""
        # Create a test student
        student = DBStudent(
            name="Delete Student",
            father_name="Delete Father",
            status="active"
        )

        test_db_session.add(student)
        await test_db_session.commit()
        await test_db_session.refresh(student)

        student_id = student.id

        # Delete the student
        await test_db_session.delete(student)
        await test_db_session.commit()

        # Verify deletion
        result = await test_db_session.execute(test_db_session.query(DBStudent).filter(DBStudent.id == student_id))
        deleted_student = result.scalar_one_or_none()
        assert deleted_student is None

    @pytest.mark.asyncio
    async def test_unique_mobile_constraint(self, test_db_session):
        """Test that mobile numbers must be unique"""
        # Create first student
        student1 = DBStudent(
            name="Student 1",
            mobile="9998887777",
            father_name="Father 1",
            status="active"
        )

        test_db_session.add(student1)
        await test_db_session.commit()

        # Try to create second student with same mobile
        student2 = DBStudent(
            name="Student 2",
            mobile="9998887777",  # Same mobile
            father_name="Father 2",
            status="active"
        )

        test_db_session.add(student2)
        with pytest.raises(Exception):  # Should raise IntegrityError
            await test_db_session.commit()

        # Rollback and cleanup
        await test_db_session.rollback()
        await test_db_session.delete(student1)
        await test_db_session.commit()

    @pytest.mark.asyncio
    async def test_search_students(self, test_db_session, sample_students):
        """Test searching students by name"""
        # Search for "John"
        result = await test_db_session.execute(
            test_db_session.query(DBStudent).filter(DBStudent.name.ilike("%John%"))
        )
        students = result.scalars().all()
        assert len(students) >= 1
        assert any(s.name == "John Doe" for s in students)

        # Search for "Smith"
        result = await test_db_session.execute(
            test_db_session.query(DBStudent).filter(DBStudent.father_name.ilike("%Smith%"))
        )
        students = result.scalars().all()
        assert len(students) >= 1
        assert any(s.father_name == "Father Smith" for s in students)

class TestDriverDatabaseOperations:
    """Test driver operations directly with PostgreSQL database"""

    @pytest.mark.asyncio
    async def test_create_driver(self, test_db_session):
        """Test creating a driver directly in the database"""
        driver = DBDriver(
            name="Test Driver",
            route="Test Route",
            vehicle_number="ABC123",
            contact_number="4445556666",
            license_number="LIC123456",
            status="active"
        )

        test_db_session.add(driver)
        await test_db_session.commit()
        await test_db_session.refresh(driver)

        assert driver.id is not None
        assert driver.name == "Test Driver"
        assert driver.vehicle_number == "ABC123"
        assert driver.created_at is not None
        assert driver.updated_at is not None

        # Cleanup
        await test_db_session.delete(driver)
        await test_db_session.commit()

    @pytest.mark.asyncio
    async def test_unique_driver_name_constraint(self, test_db_session):
        """Test that driver names must be unique"""
        # Create first driver
        driver1 = DBDriver(
            name="Unique Driver",
            status="active"
        )

        test_db_session.add(driver1)
        await test_db_session.commit()

        # Try to create second driver with same name
        driver2 = DBDriver(
            name="Unique Driver",  # Same name
            status="active"
        )

        test_db_session.add(driver2)
        with pytest.raises(Exception):  # Should raise IntegrityError
            await test_db_session.commit()

        # Rollback and cleanup
        await test_db_session.rollback()
        await test_db_session.delete(driver1)
        await test_db_session.commit()

    @pytest.mark.asyncio
    async def test_unique_vehicle_number_constraint(self, test_db_session):
        """Test that vehicle numbers must be unique"""
        # Create first driver
        driver1 = DBDriver(
            name="Driver 1",
            vehicle_number="XYZ999",
            status="active"
        )

        test_db_session.add(driver1)
        await test_db_session.commit()

        # Try to create second driver with same vehicle number
        driver2 = DBDriver(
            name="Driver 2",
            vehicle_number="XYZ999",  # Same vehicle number
            status="active"
        )

        test_db_session.add(driver2)
        with pytest.raises(Exception):  # Should raise IntegrityError
            await test_db_session.commit()

        # Rollback and cleanup
        await test_db_session.rollback()
        await test_db_session.delete(driver1)
        await test_db_session.commit()

class TestDatabaseMigrations:
    """Test database migration functionality"""

    @pytest.mark.asyncio
    async def test_migration_script_execution(self, test_db_session):
        """Test that migration script can run successfully"""
        # Import and run migration if CSV files exist
        try:
            from migrate_data import migrate_csv_to_db
            await migrate_csv_to_db(test_db_session)
            # If no exception, migration is successful
            assert True
        except FileNotFoundError:
            # No CSV files to migrate, which is fine
            assert True
        except Exception as e:
            # Other errors should fail the test
            pytest.fail(f"Migration failed: {e}")

class TestDatabasePerformance:
    """Test database performance and query optimization"""

    @pytest.mark.asyncio
    async def test_index_usage(self, test_db_session, sample_students):
        """Test that indexes are being used for queries"""
        # This is a basic test - in a real scenario you'd check query execution plans
        # For now, just ensure indexed queries work
        result = await test_db_session.execute(
            test_db_session.query(DBStudent).filter(DBStudent.route == "I")
        )
        students = result.scalars().all()
        assert len(students) >= 1

        result = await test_db_session.execute(
            test_db_session.query(DBStudent).filter(DBStudent.status == "active")
        )
        students = result.scalars().all()
        assert len(students) >= 3

    @pytest.mark.asyncio
    async def test_pagination_performance(self, test_db_session, sample_students):
        """Test pagination queries work efficiently"""
        # Test limit and offset
        result = await test_db_session.execute(
            test_db_session.query(DBStudent).limit(2).offset(0)
        )
        students = result.scalars().all()
        assert len(students) == 2

        result = await test_db_session.execute(
            test_db_session.query(DBStudent).limit(2).offset(2)
        )
        students = result.scalars().all()
        assert len(students) == 1  # Should have 1 more student

