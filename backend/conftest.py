"""
Comprehensive pytest configuration and shared fixtures.

This module provides common fixtures, configuration, and utilities
for all test modules in the project.
"""

import asyncio
import os
import tempfile
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from main import app
from src.core.models import Base


# Test database configuration
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "sqlite+aiosqlite:///./test.db"
)

# Test configuration fixtures
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    """Create a test database engine."""
    # Use in-memory SQLite for fast unit tests, PostgreSQL for integration tests
    if "sqlite" in TEST_DATABASE_URL:
        # SQLite in-memory database
        engine = create_async_engine(
            TEST_DATABASE_URL,
            connect_args={"check_same_thread": False},
            poolclass=NullPool,
            echo=False,
        )
    else:
        # PostgreSQL for integration tests
        engine = create_async_engine(
            TEST_DATABASE_URL,
            poolclass=NullPool,
            echo=False,
        )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
async def test_db(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session with transaction rollback."""
    SessionLocal = sessionmaker(
        expire_on_commit=False,
        class_=AsyncSession,
        bind=test_engine
    )

    session = SessionLocal()

    # Start a transaction for this test
    async with session.begin():
        try:
            yield session
        finally:
            # Rollback transaction to isolate tests
            await session.rollback()
            await session.close()


# HTTP client fixtures
@pytest.fixture
def test_client() -> Generator[TestClient, None, None]:
    """Create a test client for FastAPI app."""
    client = TestClient(app)
    yield client


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client for FastAPI app."""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        yield client


# Sample data fixtures
@pytest.fixture
def sample_student_data():
    """Sample student data for testing."""
    return {
        "name": "Test Student",
        "father_name": "Test Father",
        "mother_name": "Test Mother",
        "class_": "10",
        "mobile": "1234567890",
        "route": "I",
        "address": "Test Address",
        "fees": 1000.0,
        "status": "active"
    }


@pytest.fixture
def sample_driver_data():
    """Sample driver data for testing."""
    return {
        "name": "Test Driver",
        "route": "Test Route",
        "vehicle_number": "ABC123",
        "contact_number": "9876543210",
        "license_number": "LIC123456",
        "experience_years": 5
    }


@pytest.fixture
def sample_csv_data():
    """Sample CSV data for testing."""
    return """name,father_name,class,mobile,route,address,fees
John Doe,Father Doe,10,1234567890,I,Test Address 1,1000.0
Jane Smith,Father Smith,9,9876543210,II,Test Address 2,1500.0"""


@pytest.fixture
def temp_csv_file(sample_csv_data):
    """Create a temporary CSV file for testing."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        f.write(sample_csv_data)
        temp_path = f.name

    yield temp_path

    # Cleanup
    os.unlink(temp_path)


# Authentication fixtures
@pytest.fixture
def auth_headers():
    """Sample authentication headers for testing."""
    return {
        "Authorization": "Bearer test_token",
        "Content-Type": "application/json"
    }


@pytest.fixture
def invalid_auth_headers():
    """Invalid authentication headers for testing."""
    return {
        "Authorization": "Bearer invalid_token",
        "Content-Type": "application/json"
    }


# Mock fixtures
@pytest.fixture
def mock_db_session():
    """Mock database session for unit tests."""
    session = AsyncMock(spec=AsyncSession)
    session.begin.return_value.__aenter__ = AsyncMock()
    session.begin.return_value.__aexit__ = AsyncMock()
    session.rollback = AsyncMock()
    session.close = AsyncMock()
    return session


@pytest.fixture
def mock_student_service():
    """Mock student service for unit tests."""
    service = MagicMock()
    service.create_student = AsyncMock()
    service.get_students = AsyncMock()
    service.get_student_by_id = AsyncMock()
    service.update_student = AsyncMock()
    service.delete_student = AsyncMock()
    service.search_students = AsyncMock()
    return service


@pytest.fixture
def mock_driver_service():
    """Mock driver service for unit tests."""
    service = MagicMock()
    service.create_driver = AsyncMock()
    service.get_drivers = AsyncMock()
    service.get_driver_by_id = AsyncMock()
    service.update_driver = AsyncMock()
    service.delete_driver = AsyncMock()
    return service


# Environment and configuration fixtures
@pytest.fixture(autouse=True)
def set_test_env():
    """Set test environment variables."""
    old_env = os.environ.copy()

    # Set test-specific environment variables
    os.environ["TESTING"] = "true"
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
    os.environ["SECRET_KEY"] = "test_secret_key"
    os.environ["JWT_ALGORITHM"] = "HS256"

    yield

    # Restore original environment
    os.environ.clear()
    os.environ.update(old_env)


# Performance testing fixtures
@pytest.fixture
def benchmark_data():
    """Large dataset for performance testing."""
    return [
        {
            "name": f"Student {i}",
            "father_name": f"Father {i}",
            "class_": "10",
            "mobile": f"12345678{i:02d}",
            "route": "I",
            "address": f"Address {i}",
            "fees": 1000.0 + i
        }
        for i in range(100)
    ]


# Asyncio compatibility fixtures
@pytest_asyncio.fixture
async def async_sample_students(test_db, sample_student_data):
    """Create sample students asynchronously for testing."""
    from src.services.student_service import StudentService
    from src.core.models import CreateStudentRequest

    students_data = [
        CreateStudentRequest(**sample_student_data),
        CreateStudentRequest(
            **{**sample_student_data, "name": "Jane Smith", "mobile": "9876543210"}
        ),
        CreateStudentRequest(
            **{**sample_student_data, "name": "Bob Johnson", "mobile": "5556667777"}
        ),
    ]

    created_students = []
    for student_data in students_data:
        student = await StudentService.create_student(test_db, student_data)
        created_students.append(student)

    return created_students


# Error handling fixtures
@pytest.fixture
def error_response():
    """Sample error response for testing."""
    return {
        "detail": "Test error message",
        "error_code": "TEST_ERROR",
        "timestamp": "2023-01-01T00:00:00Z"
    }


# Database isolation fixtures for parallel testing
@pytest.fixture(scope="function")
def isolated_db(test_engine):
    """Provide isolated database session for parallel test execution."""
    SessionLocal = sessionmaker(
        expire_on_commit=False,
        class_=AsyncSession,
        bind=test_engine
    )

    session = SessionLocal()
    return session


# Cleanup fixtures
@pytest.fixture(autouse=True)
def cleanup_files():
    """Clean up temporary files after tests."""
    temp_files = []

    def track_file(path):
        temp_files.append(path)
        return path

    yield track_file

    # Cleanup tracked files
    for file_path in temp_files:
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
        except OSError:
            pass


# Skip conditions
def pytest_configure(config):
    """Configure pytest with custom markers and settings."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )
    config.addinivalue_line(
        "markers", "database: marks tests that require database"
    )
    config.addinivalue_line(
        "markers", "api: marks tests that test API endpoints"
    )
    config.addinivalue_line(
        "markers", "auth: marks tests that test authentication"
    )
    config.addinivalue_line(
        "markers", "performance: marks tests that measure performance"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection to handle asyncio markers."""
    for item in items:
        # Add asyncio marker to all async test functions
        if asyncio.iscoroutinefunction(item.function):
            item.add_marker(pytest.mark.asyncio)


# Performance and memory profiling fixtures
@pytest.fixture
def memory_monitor():
    """Monitor memory usage during tests."""
    import psutil
    import os

    process = psutil.Process(os.getpid())
    initial_memory = process.memory_info().rss / 1024 / 1024  # MB

    yield {
        "initial_memory": initial_memory,
        "process": process
    }

    final_memory = process.memory_info().rss / 1024 / 1024  # MB
    memory_used = final_memory - initial_memory

    print(f"\nMemory usage: {memory_used:.2f} MB")


# Database connection pool fixtures
@pytest.fixture
async def db_connection_pool(test_engine):
    """Provide database connection pool for performance testing."""
    pool = await test_engine.pool

    yield pool

    # Cleanup connections
    if hasattr(pool, '_connections'):
        for conn in pool._connections:
            await conn.close()


# Rate limiting fixtures for API testing
@pytest.fixture
def rate_limit_headers():
    """Headers for testing rate limiting."""
    return {
        "X-Forwarded-For": "127.0.0.1",
        "User-Agent": "test-client"
    }


# Guest user fixtures
@pytest.fixture
def guest_user_data():
    """Sample guest user data for testing."""
    return {
        "name": "Guest User",
        "email": "guest@example.com",
        "phone": "9998887777",
        "organization": "Test Org"
    }


# File upload fixtures
@pytest.fixture
def sample_image_file():
    """Sample image file for testing uploads."""
    # Create a minimal PNG file content
    png_content = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
        b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00'
        b'\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00'
        b'\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
    )

    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        f.write(png_content)
        temp_path = f.name

    yield temp_path

    # Cleanup
    if os.path.exists(temp_path):
        os.unlink(temp_path)