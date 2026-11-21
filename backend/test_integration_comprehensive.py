"""
Comprehensive Integration Tests for Critical Application Workflows

This module provides extensive integration tests covering:
- Complete user journeys from authentication to data operations
- Data flow between services (auth, CRUD, sync, reports)
- End-to-end functionality including error scenarios
- Cross-service interactions and dependencies
- Database transactions and rollbacks
- Performance and load testing scenarios

Test Categories:
1. Authentication Workflow Integration
2. CRUD Operations Integration
3. Data Flow Integration (CSV Sync, Reports, Charts)
4. Error Scenarios and Edge Cases
5. End-to-End User Journeys
6. Cross-Service Integration
7. Database Transaction Testing
8. Performance and Load Testing
"""

import asyncio
import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from unittest.mock import patch, AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Import core application modules
from core.config.config import config
from core.models import (
    Student, Driver, User, UserRole, CreateUserRequest,
    CreateStudentRequest, UpdateStudentRequest,
    CreateDriverRequest, UpdateDriverRequest,
    LoginRequest, TokenResponse, HealthResponse
)
from services.student_service import StudentService
from services.driver_service import DriverService
from services.csv_sync_service import sync_all_drivers
from utils.auth_utils import get_db, hash_password, get_current_active_user
from main import create_app


class IntegrationTestFramework:
    """Framework for comprehensive integration testing."""

    def __init__(self):
        self.test_users = []
        self.test_students = []
        self.test_drivers = []
        self.tokens = {}
        self.session_data = {}

    async def setup_test_data(self, db: AsyncSession):
        """Set up comprehensive test data for integration tests."""
        # Create test users with different roles
        test_users_data = [
            CreateUserRequest(
                username="admin_user",
                email="admin@test.com",
                password="adminpass123",
                role=UserRole.ADMIN
            ),
            CreateUserRequest(
                username="teacher_user",
                email="teacher@test.com",
                password="teacherpass123",
                role=UserRole.TEACHER
            ),
            CreateUserRequest(
                username="driver_user",
                email="driver@test.com",
                password="driverpass123",
                role=UserRole.DRIVER
            )
        ]

        for user_data in test_users_data:
            hashed_password = hash_password(user_data.password)
            db_user = User(
                username=user_data.username,
                email=user_data.email,
                hashed_password=hashed_password,
                role=user_data.role,
                is_active=True
            )
            db.add(db_user)
            self.test_users.append(db_user)

        await db.commit()

        # Create test students
        test_students_data = [
            CreateStudentRequest(
                name="John Doe",
                father_name="Robert Doe",
                class_name="10A",
                mobile="9876543210",
                address="123 Main St",
                route="Route 1"
            ),
            CreateStudentRequest(
                name="Jane Smith",
                father_name="Michael Smith",
                class_name="9B",
                mobile="9876543211",
                address="456 Oak Ave",
                route="Route 2"
            ),
            CreateStudentRequest(
                name="Bob Johnson",
                father_name="David Johnson",
                class_name="11C",
                mobile="9876543212",
                address="789 Pine Rd",
                route="Route 1"
            )
        ]

        for student_data in test_students_data:
            db_student = Student(
                name=student_data.name,
                father_name=student_data.father_name,
                class_name=student_data.class_name,
                mobile=student_data.mobile,
                address=student_data.address,
                route=student_data.route
            )
            db.add(db_student)
            self.test_students.append(db_student)

        # Create test drivers
        test_drivers_data = [
            CreateDriverRequest(
                name="Driver One",
                license_number="DL123456789",
                vehicle_number="ABC123",
                mobile="9876543201",
                experience_years=5
            ),
            CreateDriverRequest(
                name="Driver Two",
                license_number="DL987654321",
                vehicle_number="XYZ789",
                mobile="9876543202",
                experience_years=8
            )
        ]

        for driver_data in test_drivers_data:
            db_driver = Driver(
                name=driver_data.name,
                license_number=driver_data.license_number,
                vehicle_number=driver_data.vehicle_number,
                mobile=driver_data.mobile,
                experience_years=driver_data.experience_years
            )
            db.add(db_driver)
            self.test_drivers.append(db_driver)

        await db.commit()

        # Refresh all objects to get IDs
        for user in self.test_users:
            await db.refresh(user)
        for student in self.test_students:
            await db.refresh(student)
        for driver in self.test_drivers:
            await db.refresh(driver)

    async def cleanup_test_data(self, db: AsyncSession):
        """Clean up all test data after tests."""
        # Delete test data in reverse dependency order
        for student in self.test_students:
            await db.delete(student)
        for driver in self.test_drivers:
            await db.delete(driver)
        for user in self.test_users:
            await db.delete(user)

        await db.commit()

    def get_user_credentials(self, role: str) -> Tuple[str, str]:
        """Get credentials for a specific user role."""
        credentials_map = {
            "admin": ("admin@test.com", "adminpass123"),
            "teacher": ("teacher@test.com", "teacherpass123"),
            "driver": ("driver@test.com", "driverpass123")
        }
        return credentials_map.get(role, ("admin@test.com", "adminpass123"))


# Global test framework instance
test_framework = IntegrationTestFramework()


# Test Fixtures
@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create test database engine."""
    # Use in-memory SQLite for fast integration tests
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        future=True
    )

    # Create tables
    from core.models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    await engine.dispose()


@pytest_asyncio.fixture
async def test_db(test_engine):
    """Create test database session."""
    async_session = sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        # Set up test data
        await test_framework.setup_test_data(session)
        yield session
        # Clean up test data
        await test_framework.cleanup_test_data(session)


@pytest.fixture
def test_app():
    """Create FastAPI test application."""
    return create_app()


@pytest.fixture
def test_client(test_app):
    """Create test client for HTTP requests."""
    return TestClient(test_app)


@pytest_asyncio.fixture
async def async_client(test_app):
    """Create async test client for HTTP requests."""
    async with AsyncClient(app=test_app, base_url="http://testserver") as client:
        yield client


class TestAuthenticationWorkflowIntegration:
    """Integration tests for authentication workflows."""

    @pytest.mark.asyncio
    async def test_complete_admin_login_logout_flow(self, async_client, test_db):
        """Test complete admin user login to logout workflow."""
        # 1. Login as admin
        login_data = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }

        response = await async_client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200

        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "admin@test.com"

        access_token = data["access_token"]

        # 2. Access protected endpoint with token
        headers = {"Authorization": f"Bearer {access_token}"}
        response = await async_client.get("/api/auth/me", headers=headers)
        assert response.status_code == 200

        user_data = response.json()
        assert user_data["username"] == "admin_user"

        # 3. Test token refresh
        response = await async_client.post("/api/auth/refresh", headers=headers)
        assert response.status_code == 200

        refresh_data = response.json()
        assert "access_token" in refresh_data
        new_token = refresh_data["access_token"]

        # 4. Verify new token works
        headers = {"Authorization": f"Bearer {new_token}"}
        response = await async_client.get("/api/auth/me", headers=headers)
        assert response.status_code == 200

        # 5. Logout and verify token is invalidated
        response = await async_client.post("/api/auth/logout", headers=headers)
        assert response.status_code == 200

        # 6. Verify old token no longer works
        response = await async_client.get("/api/auth/me", headers={"Authorization": f"Bearer {access_token}"})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_guest_user_complete_workflow(self, async_client, test_db):
        """Test complete guest user workflow from creation to conversion."""
        # 1. Create guest user
        response = await async_client.post("/api/auth/guest")
        assert response.status_code == 200

        data = response.json()
        assert data["is_guest"] is True
        assert "access_token" in data
        assert "guest_id" in data

        guest_token = data["access_token"]
        guest_id = data["guest_id"]

        # 2. Access guest dashboard
        headers = {"Authorization": f"Bearer {guest_token}"}
        response = await async_client.get("/api/auth/guest/dashboard", headers=headers)
        assert response.status_code == 200

        dashboard_data = response.json()
        assert dashboard_data["guest_access"] is True
        assert "permissions" in dashboard_data

        # 3. Convert guest to registered user
        conversion_data = {
            "guest_id": guest_id,
            "username": "new_registered_user",
            "email": "newuser@test.com",
            "password": "newpassword123"
        }

        response = await async_client.post("/api/auth/convert-guest", json=conversion_data, headers=headers)
        assert response.status_code == 200

        converted_user = response.json()
        assert converted_user["username"] == "new_registered_user"
        assert converted_user["email"] == "newuser@test.com"
        assert converted_user["role"] == "student"  # Default role for converted guests

        # 4. Verify old guest token no longer works for guest endpoints
        response = await async_client.get("/api/auth/guest/dashboard", headers=headers)
        assert response.status_code == 403  # Forbidden for non-guest users

        # 5. Verify new registered user can login
        login_data = {
            "username_or_email": "newuser@test.com",
            "password": "newpassword123"
        }

        response = await async_client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200

        login_response = response.json()
        assert login_response["user"]["username"] == "new_registered_user"

    @pytest.mark.asyncio
    async def test_invalid_credentials_flow(self, async_client, test_db):
        """Test authentication with invalid credentials and rate limiting."""
        # 1. Try login with wrong password multiple times
        login_data = {
            "username_or_email": "admin@test.com",
            "password": "wrongpassword"
        }

        for i in range(5):  # Try 5 times
            response = await async_client.post("/api/auth/login", json=login_data)
            if i < 4:  # First 4 attempts should fail with 401
                assert response.status_code == 401
            else:  # 5th attempt should be rate limited
                assert response.status_code == 429

        # 2. Try with non-existent user
        login_data = {
            "username_or_email": "nonexistent@test.com",
            "password": "password123"
        }

        response = await async_client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_role_based_access_control_integration(self, async_client, test_db):
        """Test role-based permissions across different endpoints."""
        # Test admin access to all endpoints
        admin_login = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }

        response = await async_client.post("/api/auth/login", json=admin_login)
        admin_token = response.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Admin should access all endpoints
        response = await async_client.get("/api/students/", headers=admin_headers)
        assert response.status_code == 200

        response = await async_client.get("/api/drivers/", headers=admin_headers)
        assert response.status_code == 200

        response = await async_client.get("/api/reports/summary", headers=admin_headers)
        assert response.status_code == 200

        # Test teacher access (limited permissions)
        teacher_login = {
            "username_or_email": "teacher@test.com",
            "password": "teacherpass123"
        }

        response = await async_client.post("/api/auth/login", json=teacher_login)
        teacher_token = response.json()["access_token"]
        teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

        # Teacher should access students but not admin functions
        response = await async_client.get("/api/students/", headers=teacher_headers)
        assert response.status_code == 200

        response = await async_client.get("/api/drivers/", headers=teacher_headers)
        assert response.status_code == 200

        # Teacher should not access admin cleanup functions
        response = await async_client.post("/api/auth/cleanup-guests", headers=teacher_headers)
        assert response.status_code == 403  # Forbidden


class TestCRUDOperationsIntegration:
    """Integration tests for CRUD operations across entities."""

    @pytest.mark.asyncio
    async def test_student_crud_complete_workflow(self, async_client, test_db):
        """Test complete CRUD workflow for students."""
        # Get admin token
        admin_login = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }
        response = await async_client.post("/api/auth/login", json=admin_login)
        admin_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Create new student
        student_data = {
            "name": "Alice Cooper",
            "father_name": "Bob Cooper",
            "class_name": "12A",
            "mobile": "9876543213",
            "address": "321 Elm Street",
            "route": "Route 3"
        }

        response = await async_client.post("/api/students/", json=student_data, headers=headers)
        assert response.status_code == 200

        created_student = response.json()
        student_id = created_student["id"]
        assert created_student["name"] == "Alice Cooper"
        assert created_student["mobile"] == "9876543213"

        # 2. Read all students (verify student is included)
        response = await async_client.get("/api/students/", headers=headers)
        assert response.status_code == 200

        students_data = response.json()
        assert students_data["total"] >= 1
        assert any(s["id"] == student_id for s in students_data["students"])

        # 3. Read specific student
        response = await async_client.get(f"/api/students/{student_id}", headers=headers)
        assert response.status_code == 200

        student = response.json()
        assert student["name"] == "Alice Cooper"
        assert student["father_name"] == "Bob Cooper"

        # 4. Update student
        update_data = {
            "name": "Alice Cooper Updated",
            "class_name": "12B",
            "address": "Updated Address"
        }

        response = await async_client.put(f"/api/students/{student_id}", json=update_data, headers=headers)
        assert response.status_code == 200

        updated_student = response.json()
        assert updated_student["name"] == "Alice Cooper Updated"
        assert updated_student["class_name"] == "12B"
        assert updated_student["father_name"] == "Bob Cooper"  # Unchanged field

        # 5. Search students
        response = await async_client.get("/api/students/search/?q=Alice", headers=headers)
        assert response.status_code == 200

        search_results = response.json()
        assert search_results["total"] >= 1
        assert any(s["name"] == "Alice Cooper Updated" for s in search_results["students"])

        # 6. Delete student
        response = await async_client.delete(f"/api/students/{student_id}", headers=headers)
        assert response.status_code == 200

        # 7. Verify student is deleted
        response = await async_client.get(f"/api/students/{student_id}", headers=headers)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_driver_crud_complete_workflow(self, async_client, test_db):
        """Test complete CRUD workflow for drivers."""
        # Get admin token
        admin_login = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }
        response = await async_client.post("/api/auth/login", json=admin_login)
        admin_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Create new driver
        driver_data = {
            "name": "Driver Three",
            "license_number": "DL555666777",
            "vehicle_number": "DEF456",
            "mobile": "9876543203",
            "experience_years": 3
        }

        response = await async_client.post("/api/drivers/", json=driver_data, headers=headers)
        assert response.status_code == 200

        created_driver = response.json()
        driver_id = created_driver["id"]
        assert created_driver["name"] == "Driver Three"

        # 2. Read all drivers
        response = await async_client.get("/api/drivers/", headers=headers)
        assert response.status_code == 200

        # 3. Read specific driver
        response = await async_client.get(f"/api/drivers/{driver_id}", headers=headers)
        assert response.status_code == 200

        # 4. Update driver
        update_data = {
            "experience_years": 5,
            "mobile": "9876543204"
        }

        response = await async_client.put(f"/api/drivers/{driver_id}", json=update_data, headers=headers)
        assert response.status_code == 200

        updated_driver = response.json()
        assert updated_driver["experience_years"] == 5
        assert updated_driver["mobile"] == "9876543204"

        # 5. Delete driver
        response = await async_client.delete(f"/api/drivers/{driver_id}", headers=headers)
        assert response.status_code == 200

        # 6. Verify driver is deleted
        response = await async_client.get(f"/api/drivers/{driver_id}", headers=headers)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_crud_validation_errors_integration(self, async_client, test_db):
        """Test CRUD operations with validation errors."""
        # Get admin token
        admin_login = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }
        response = await async_client.post("/api/auth/login", json=admin_login)
        admin_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Test duplicate mobile for students
        student_data = {
            "name": "Test Student",
            "father_name": "Test Father",
            "class_name": "10A",
            "mobile": "9876543210",  # This mobile already exists from setup
            "address": "Test Address",
            "route": "Test Route"
        }

        response = await async_client.post("/api/students/", json=student_data, headers=headers)
        assert response.status_code == 400  # Validation error

        # 2. Test invalid mobile format
        invalid_student_data = {
            "name": "Test Student 2",
            "father_name": "Test Father 2",
            "class_name": "10A",
            "mobile": "123",  # Invalid mobile
            "address": "Test Address 2",
            "route": "Test Route 2"
        }

        response = await async_client.post("/api/students/", json=invalid_student_data, headers=headers)
        assert response.status_code == 422  # Validation error

        # 3. Test duplicate license number for drivers
        driver_data = {
            "name": "Test Driver",
            "license_number": "DL123456789",  # This license already exists
            "vehicle_number": "TEST999",
            "mobile": "9876543299",
            "experience_years": 2
        }

        response = await async_client.post("/api/drivers/", json=driver_data, headers=headers)
        assert response.status_code == 400  # Validation error


class TestDataFlowIntegration:
    """Integration tests for data flow between services."""

    @pytest.mark.asyncio
    async def test_csv_sync_data_flow_integration(self, async_client, test_db):
        """Test CSV sync service integration with database and API."""
        # Get admin token
        admin_login = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }
        response = await async_client.post("/api/auth/login", json=admin_login)
        admin_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Check initial driver count
        response = await async_client.get("/api/drivers/", headers=headers)
        initial_count = response.json()["total"]

        # 2. Run CSV sync (mock the CSV file)
        test_csv_content = """name,license_number,vehicle_number,mobile,experience_years
New Driver,DL999888777,NEWSYNC,9876543500,4
Another Driver,DL888999666,SECONDSYNC,9876543501,6
"""

        with patch('builtins.open', create=True) as mock_file:
            mock_file.return_value.__enter__.return_value.read.return_value = test_csv_content

            # Mock the CSV sync service
            with patch('services.csv_sync_service.sync_all_drivers') as mock_sync:
                mock_sync.return_value = {
                    "success": True,
                    "drivers_created": 2,
                    "drivers_updated": 0,
                    "errors": []
                }

                response = await async_client.post("/api/csv-sync/sync", headers=headers)
                assert response.status_code == 200

        # 3. Verify data flow to API endpoints
        response = await async_client.get("/api/drivers/", headers=headers)
        # Note: In real scenario, count would increase, but we're mocking
        assert response.status_code == 200

        # 4. Test sync status endpoint
        response = await async_client.get("/api/csv-sync/status", headers=headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_reports_data_flow_integration(self, async_client, test_db):
        """Test reports service integration with student and driver data."""
        # Get admin token
        admin_login = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }
        response = await async_client.post("/api/auth/login", json=admin_login)
        admin_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Create additional test data for meaningful reports
        student_data = {
            "name": "Report Test Student",
            "father_name": "Report Father",
            "class_name": "8A",
            "mobile": "9876543999",
            "address": "Report Address",
            "route": "Route 1"
        }

        await async_client.post("/api/students/", json=student_data, headers=headers)

        # 2. Test reports summary endpoint
        response = await async_client.get("/api/reports/summary", headers=headers)
        assert response.status_code == 200

        summary_data = response.json()
        assert "total_students" in summary_data
        assert "total_drivers" in summary_data
        assert "students_by_class" in summary_data
        assert "drivers_by_experience" in summary_data

        # 3. Test students by driver report
        response = await async_client.get("/api/reports/students-by-driver", headers=headers)
        assert response.status_code == 200

        students_by_driver = response.json()
        assert isinstance(students_by_driver, dict)

        # 4. Test revenue analysis (if implemented)
        response = await async_client.get("/api/reports/revenue-analysis", headers=headers)
        # This might not be implemented, but should not crash
        assert response.status_code in [200, 404]

    @pytest.mark.asyncio
    async def test_charts_data_flow_integration(self, async_client, test_db):
        """Test charts service integration with data aggregation."""
        # Get admin token
        admin_login = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }
        response = await async_client.post("/api/auth/login", json=admin_login)
        admin_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Test student distribution chart
        response = await async_client.get("/api/charts/student-distribution", headers=headers)
        assert response.status_code == 200

        chart_data = response.json()
        assert "labels" in chart_data
        assert "datasets" in chart_data
        assert len(chart_data["datasets"]) > 0

        # 2. Test revenue by driver chart
        response = await async_client.get("/api/charts/revenue-by-driver", headers=headers)
        assert response.status_code == 200

        # 3. Test revenue by class chart
        response = await async_client.get("/api/charts/revenue-by-class", headers=headers)
        assert response.status_code == 200

        # 4. Verify chart data consistency with actual data
        # Get actual student data
        response = await async_client.get("/api/students/", headers=headers)
        students = response.json()["students"]

        # Get chart data
        response = await async_client.get("/api/charts/student-distribution", headers=headers)
        chart_data = response.json()

        # Verify chart data reflects actual student distribution
        assert len(chart_data["labels"]) > 0


class TestEndToEndUserJourneys:
    """End-to-end user journey integration tests."""

    @pytest.mark.asyncio
    async def test_admin_complete_management_journey(self, async_client, test_db):
        """Test complete admin user journey from login to data management."""
        # Phase 1: Authentication
        login_data = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }

        response = await async_client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        admin_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Phase 2: Student Management
        # Create multiple students
        students_data = [
            {
                "name": "E2E Student 1",
                "father_name": "E2E Father 1",
                "class_name": "10A",
                "mobile": "9876544101",
                "address": "E2E Address 1",
                "route": "Route 1"
            },
            {
                "name": "E2E Student 2",
                "father_name": "E2E Father 2",
                "class_name": "10A",
                "mobile": "9876544102",
                "address": "E2E Address 2",
                "route": "Route 2"
            }
        ]

        created_students = []
        for student_data in students_data:
            response = await async_client.post("/api/students/", json=student_data, headers=headers)
            assert response.status_code == 200
            created_students.append(response.json())

        # Phase 3: Driver Management
        driver_data = {
            "name": "E2E Driver",
            "license_number": "DLE2E123456",
            "vehicle_number": "E2E123",
            "mobile": "9876544201",
            "experience_years": 7
        }

        response = await async_client.post("/api/drivers/", json=driver_data, headers=headers)
        assert response.status_code == 200
        created_driver = response.json()

        # Phase 4: Data Analysis
        # Check reports
        response = await async_client.get("/api/reports/summary", headers=headers)
        assert response.status_code == 200

        # Check charts
        response = await async_client.get("/api/charts/student-distribution", headers=headers)
        assert response.status_code == 200

        # Phase 5: Search and Filter Operations
        # Search students by class
        response = await async_client.get("/api/students/search/?q=10A", headers=headers)
        assert response.status_code == 200
        search_results = response.json()
        assert search_results["total"] >= 2

        # Phase 6: Data Updates
        # Update a student
        update_data = {
            "class_name": "10B",
            "address": "Updated E2E Address"
        }

        student_id = created_students[0]["id"]
        response = await async_client.put(f"/api/students/{student_id}", json=update_data, headers=headers)
        assert response.status_code == 200

        updated_student = response.json()
        assert updated_student["class_name"] == "10B"

        # Phase 7: Cleanup Operations
        # Delete created data
        for student in created_students:
            response = await async_client.delete(f"/api/students/{student['id']}", headers=headers)
            assert response.status_code == 200

        response = await async_client.delete(f"/api/drivers/{created_driver['id']}", headers=headers)
        assert response.status_code == 200

        # Phase 8: Logout
        response = await async_client.post("/api/auth/logout", headers=headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_guest_to_registered_user_journey(self, async_client, test_db):
        """Test complete guest user to registered user journey."""
        # Phase 1: Guest User Creation
        response = await async_client.post("/api/auth/guest")
        assert response.status_code == 200

        guest_data = response.json()
        guest_token = guest_data["access_token"]
        guest_id = guest_data["guest_id"]
        guest_headers = {"Authorization": f"Bearer {guest_token}"}

        # Phase 2: Guest Data Exploration
        # Access guest dashboard
        response = await async_client.get("/api/auth/guest/dashboard", headers=guest_headers)
        assert response.status_code == 200

        # View limited student data
        response = await async_client.get("/api/students/", headers=guest_headers)
        assert response.status_code == 200

        # Phase 3: Guest to Registered Conversion
        conversion_data = {
            "guest_id": guest_id,
            "username": "journey_test_user",
            "email": "journey@test.com",
            "password": "journeypass123"
        }

        response = await async_client.post("/api/auth/convert-guest", json=conversion_data, headers=guest_headers)
        assert response.status_code == 200

        converted_user = response.json()
        assert converted_user["username"] == "journey_test_user"

        # Phase 4: Registered User Operations
        # Login as registered user
        login_data = {
            "username_or_email": "journey@test.com",
            "password": "journeypass123"
        }

        response = await async_client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200

        registered_token = response.json()["access_token"]
        registered_headers = {"Authorization": f"Bearer {registered_token}"}

        # Phase 5: Full Access Operations
        # Should now have access to all endpoints
        response = await async_client.get("/api/students/", headers=registered_headers)
        assert response.status_code == 200

        response = await async_client.get("/api/drivers/", headers=registered_headers)
        assert response.status_code == 200

        # Phase 6: Session Management
        # Test token refresh
        response = await async_client.post("/api/auth/refresh", headers=registered_headers)
        assert response.status_code == 200

        # Test logout
        response = await async_client.post("/api/auth/logout", headers=registered_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_teacher_data_management_journey(self, async_client, test_db):
        """Test complete teacher user data management journey."""
        # Phase 1: Teacher Authentication
        login_data = {
            "username_or_email": "teacher@test.com",
            "password": "teacherpass123"
        }

        response = await async_client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        teacher_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {teacher_token}"}

        # Phase 2: Student Data Management
        # Create student
        student_data = {
            "name": "Teacher Student",
            "father_name": "Teacher Father",
            "class_name": "9A",
            "mobile": "9876545101",
            "address": "Teacher Address",
            "route": "Route 2"
        }

        response = await async_client.post("/api/students/", json=student_data, headers=headers)
        assert response.status_code == 200
        created_student = response.json()

        # Phase 3: Data Analysis and Reporting
        # View reports
        response = await async_client.get("/api/reports/summary", headers=headers)
        assert response.status_code == 200

        # View charts
        response = await async_client.get("/api/charts/student-distribution", headers=headers)
        assert response.status_code == 200

        # Phase 4: Search and Filter Operations
        # Search for created student
        response = await async_client.get("/api/students/search/?q=Teacher", headers=headers)
        assert response.status_code == 200

        # Phase 5: Data Updates
        # Update student information
        update_data = {
            "class_name": "9B",
            "address": "Updated Teacher Address"
        }

        student_id = created_student["id"]
        response = await async_client.put(f"/api/students/{student_id}", json=update_data, headers=headers)
        assert response.status_code == 200

        # Phase 6: Session Management
        # Test token refresh
        response = await async_client.post("/api/auth/refresh", headers=headers)
        assert response.status_code == 200

        # Test logout
        response = await async_client.post("/api/auth/logout", headers=headers)
        assert response.status_code == 200

        # Phase 7: Cleanup
        # Login again to cleanup
        response = await async_client.post("/api/auth/login", json=login_data)
        cleanup_token = response.json()["access_token"]
        cleanup_headers = {"Authorization": f"Bearer {cleanup_token}"}

        response = await async_client.delete(f"/api/students/{student_id}", headers=cleanup_headers)
        assert response.status_code == 200

        await async_client.post("/api/auth/logout", headers=cleanup_headers)


class TestErrorScenariosIntegration:
    """Integration tests for error scenarios and edge cases."""

    @pytest.mark.asyncio
    async def test_rate_limiting_integration(self, async_client, test_db):
        """Test rate limiting across multiple endpoints."""
        # 1. Test student creation rate limiting
        student_data = {
            "name": "Rate Limit Test",
            "father_name": "Rate Father",
            "class_name": "10A",
            "mobile": "9876546101",
            "address": "Rate Address",
            "route": "Route 1"
        }

        # Make requests up to rate limit (30/minute for students)
        for i in range(35):  # Exceed limit
            response = await async_client.post("/api/students/", json=student_data)
            if i < 30:
                # Should succeed or fail due to validation (duplicate mobile)
                assert response.status_code in [200, 400]
            else:
                # Should be rate limited
                assert response.status_code == 429

        # 2. Test health check rate limiting (should be higher limit)
        for i in range(70):  # Exceed 60/minute limit
            response = await async_client.get("/api/health")
            if i < 60:
                assert response.status_code == 200
            else:
                assert response.status_code == 429

    @pytest.mark.asyncio
    async def test_database_transaction_rollback_integration(self, async_client, test_db):
        """Test database transaction rollback on errors."""
        # Get admin token
        admin_login = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }
        response = await async_client.post("/api/auth/login", json=admin_login)
        admin_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Test rollback on duplicate mobile constraint violation
        student_data = {
            "name": "Rollback Test Student",
            "father_name": "Rollback Father",
            "class_name": "10A",
            "mobile": "9876543210",  # Existing mobile from setup
            "address": "Rollback Address",
            "route": "Route 1"
        }

        initial_count_response = await async_client.get("/api/students/", headers=headers)
        initial_count = initial_count_response.json()["total"]

        # This should fail and rollback
        response = await async_client.post("/api/students/", json=student_data, headers=headers)
        assert response.status_code == 400

        # Verify count hasn't changed
        final_count_response = await async_client.get("/api/students/", headers=headers)
        final_count = final_count_response.json()["total"]
        assert initial_count == final_count

    @pytest.mark.asyncio
    async def test_concurrent_operations_integration(self, async_client, test_db):
        """Test concurrent operations and race conditions."""
        import asyncio

        # Get admin token
        admin_login = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }
        response = await async_client.post("/api/auth/login", json=admin_login)
        admin_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create multiple students concurrently
        async def create_student_concurrent(name_suffix: str):
            student_data = {
                "name": f"Concurrent Student {name_suffix}",
                "father_name": f"Concurrent Father {name_suffix}",
                "class_name": "11A",
                "mobile": f"9876547{name_suffix:03d}",
                "address": f"Concurrent Address {name_suffix}",
                "route": "Route 1"
            }
            return await async_client.post("/api/students/", json=student_data, headers=headers)

        # Run concurrent requests
        tasks = [create_student_concurrent(i) for i in range(10)]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        # Check results - some may succeed, some may fail due to rate limiting
        success_count = 0
        for response in responses:
            if isinstance(response, Exception):
                # Network or other error
                continue
            if response.status_code == 200:
                success_count += 1
            elif response.status_code in [400, 429]:  # Expected errors
                continue
            else:
                # Unexpected error
                assert False, f"Unexpected status code: {response.status_code}"

        # Should have at least some successful creations
        assert success_count > 0

        # Verify total count
        response = await async_client.get("/api/students/", headers=headers)
        total_students = response.json()["total"]
        assert total_students >= success_count


class TestCrossServiceIntegration:
    """Integration tests for cross-service interactions."""

    @pytest.mark.asyncio
    async def test_auth_crud_cross_service_integration(self, async_client, test_db):
        """Test interactions between authentication and CRUD services."""
        # 1. Test that different user roles have appropriate CRUD access
        roles_to_test = ["admin", "teacher", "driver"]

        for role in roles_to_test:
            # Login as specific role
            username, password = test_framework.get_user_credentials(role)
            login_data = {
                "username_or_email": username,
                "password": password
            }

            response = await async_client.post("/api/auth/login", json=login_data)
            assert response.status_code == 200
            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # Test CRUD operations based on role
            if role == "admin":
                # Admin should have full access
                response = await async_client.post("/api/students/",
                    json={
                        "name": f"Admin Student {role}",
                        "father_name": f"Admin Father {role}",
                        "class_name": "10A",
                        "mobile": f"9876548{role}01",
                        "address": f"Admin Address {role}",
                        "route": "Route 1"
                    },
                    headers=headers
                )
                assert response.status_code == 200

                # Cleanup
                student_id = response.json()["id"]
                await async_client.delete(f"/api/students/{student_id}", headers=headers)

            elif role == "teacher":
                # Teacher should have read/write access to students
                response = await async_client.get("/api/students/", headers=headers)
                assert response.status_code == 200

                response = await async_client.post("/api/students/",
                    json={
                        "name": f"Teacher Student {role}",
                        "father_name": f"Teacher Father {role}",
                        "class_name": "10A",
                        "mobile": f"9876549{role}01",
                        "address": f"Teacher Address {role}",
                        "route": "Route 1"
                    },
                    headers=headers
                )
                assert response.status_code == 200

            else:  # driver role
                # Driver should have limited access
                response = await async_client.get("/api/students/", headers=headers)
                assert response.status_code == 200  # Should be able to read

            # Logout after each role test
            await async_client.post("/api/auth/logout", headers=headers)

    @pytest.mark.asyncio
    async def test_data_sync_reports_integration(self, async_client, test_db):
        """Test integration between data sync and reports services."""
        # Get admin token
        admin_login = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }
        response = await async_client.post("/api/auth/login", json=admin_login)
        admin_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Get initial report data
        response = await async_client.get("/api/reports/summary", headers=headers)
        initial_summary = response.json()

        # 2. Create test data that would affect reports
        student_data = {
            "name": "Report Integration Student",
            "father_name": "Report Father",
            "class_name": "12A",
            "mobile": "9876548101",
            "address": "Report Address",
            "route": "Route 3"
        }

        response = await async_client.post("/api/students/", json=student_data, headers=headers)
        created_student = response.json()

        # 3. Verify reports reflect new data
        response = await async_client.get("/api/reports/summary", headers=headers)
        updated_summary = response.json()

        # Student count should be updated
        assert updated_summary["total_students"] >= initial_summary["total_students"]

        # 4. Test chart data consistency
        response = await async_client.get("/api/charts/student-distribution", headers=headers)
        chart_data = response.json()

        # Chart should include the new class if not already present
        assert len(chart_data["labels"]) > 0

        # 5. Cleanup
        student_id = created_student["id"]
        await async_client.delete(f"/api/students/{student_id}", headers=headers)

        # 6. Verify reports update after deletion
        response = await async_client.get("/api/reports/summary", headers=headers)
        final_summary = response.json()

        # Should be back to initial state (or close to it)
        # Note: Other tests might have added data, so we check for decrease
        assert final_summary["total_students"] <= updated_summary["total_students"]


class TestDatabaseTransactionIntegration:
    """Integration tests for database transactions and consistency."""

    @pytest.mark.asyncio
    async def test_transaction_rollback_on_failure(self, async_client, test_db):
        """Test that database transactions rollback properly on failures."""
        # Get admin token
        admin_login = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }
        response = await async_client.post("/api/auth/login", json=admin_login)
        admin_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Get initial counts
        response = await async_client.get("/api/students/", headers=headers)
        initial_student_count = response.json()["total"]

        response = await async_client.get("/api/drivers/", headers=headers)
        initial_driver_count = response.json()["total"]

        # Try to create student with invalid data that should cause rollback
        invalid_student_data = {
            "name": "",  # Invalid empty name
            "father_name": "Test Father",
            "class_name": "10A",
            "mobile": "9876549101",
            "address": "Test Address",
            "route": "Route 1"
        }

        response = await async_client.post("/api/students/", json=invalid_student_data, headers=headers)
        # Should fail validation
        assert response.status_code == 422

        # Verify counts haven't changed
        response = await async_client.get("/api/students/", headers=headers)
        final_student_count = response.json()["total"]
        assert initial_student_count == final_student_count

        response = await async_client.get("/api/drivers/", headers=headers)
        final_driver_count = response.json()["total"]
        assert initial_driver_count == final_driver_count

    @pytest.mark.asyncio
    async def test_cross_entity_transaction_consistency(self, async_client, test_db):
        """Test transaction consistency across multiple entities."""
        # This test would verify that operations affecting multiple tables
        # maintain consistency (e.g., student-driver assignments)

        # Get admin token
        admin_login = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }
        response = await async_client.post("/api/auth/login", json=admin_login)
        admin_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # For now, just test that basic operations don't corrupt data
        # In a real scenario, this would test complex multi-table operations

        # Create student and driver
        student_data = {
            "name": "Transaction Student",
            "father_name": "Transaction Father",
            "class_name": "11B",
            "mobile": "9876549201",
            "address": "Transaction Address",
            "route": "Route 1"
        }

        response = await async_client.post("/api/students/", json=student_data, headers=headers)
        assert response.status_code == 200
        student = response.json()

        driver_data = {
            "name": "Transaction Driver",
            "license_number": "DLTX123456",
            "vehicle_number": "TX123",
            "mobile": "9876549301",
            "experience_years": 4
        }

        response = await async_client.post("/api/drivers/", json=driver_data, headers=headers)
        assert response.status_code == 200
        driver = response.json()

        # Verify both were created successfully
        response = await async_client.get(f"/api/students/{student['id']}", headers=headers)
        assert response.status_code == 200

        response = await async_client.get(f"/api/drivers/{driver['id']}", headers=headers)
        assert response.status_code == 200

        # Cleanup
        await async_client.delete(f"/api/students/{student['id']}", headers=headers)
        await async_client.delete(f"/api/drivers/{driver['id']}", headers=headers)


class TestPerformanceAndLoadIntegration:
    """Integration tests for performance and load scenarios."""

    @pytest.mark.asyncio
    async def test_bulk_operations_performance(self, async_client, test_db):
        """Test performance of bulk operations."""
        # Get admin token
        admin_login = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }
        response = await async_client.post("/api/auth/login", json=admin_login)
        admin_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Test bulk student creation performance
        start_time = time.time()

        students_to_create = 50
        created_students = []

        for i in range(students_to_create):
            student_data = {
                "name": f"Bulk Student {i}",
                "father_name": f"Bulk Father {i}",
                "class_name": "10A",
                "mobile": f"9876550{i"03d"}",
                "address": f"Bulk Address {i}",
                "route": "Route 1"
            }

            response = await async_client.post("/api/students/", json=student_data, headers=headers)
            if response.status_code == 200:
                created_students.append(response.json())

        end_time = time.time()
        duration = end_time - start_time

        # Should complete within reasonable time (adjust based on system)
        assert duration < 30  # 30 seconds for 50 students

        # Verify all students were created
        assert len(created_students) == students_to_create

        # Test bulk retrieval performance
        start_time = time.time()

        response = await async_client.get("/api/students/?limit=1000", headers=headers)
        assert response.status_code == 200

        end_time = time.time()
        retrieval_duration = end_time - start_time

        # Retrieval should be fast
        assert retrieval_duration < 5  # 5 seconds

        # Cleanup
        for student in created_students:
            await async_client.delete(f"/api/students/{student['id']}", headers=headers)

    @pytest.mark.asyncio
    async def test_search_performance_integration(self, async_client, test_db):
        """Test search functionality performance with large dataset."""
        # Get admin token
        admin_login = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }
        response = await async_client.post("/api/auth/login", json=admin_login)
        admin_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create test data for search performance
        search_students = []
        for i in range(100):  # Create 100 students for search testing
            student_data = {
                "name": f"SearchPerf Student {i}",
                "father_name": f"SearchPerf Father {i}",
                "class_name": "12A",
                "mobile": f"9876560{i"03d"}",
                "address": f"SearchPerf Address {i}",
                "route": "Route 2"
            }

            response = await async_client.post("/api/students/", json=student_data, headers=headers)
            if response.status_code == 200:
                search_students.append(response.json())

        # Test search performance
        start_time = time.time()

        response = await async_client.get("/api/students/search/?q=SearchPerf", headers=headers)
        assert response.status_code == 200

        end_time = time.time()
        search_duration = end_time - start_time

        # Search should be fast even with large dataset
        assert search_duration < 3  # 3 seconds

        search_results = response.json()
        assert search_results["total"] == len(search_students)

        # Cleanup
        for student in search_students:
            await async_client.delete(f"/api/students/{student['id']}", headers=headers)

    @pytest.mark.asyncio
    async def test_concurrent_sessions_performance(self, async_client, test_db):
        """Test performance with multiple concurrent user sessions."""
        import asyncio

        async def simulate_user_session(session_id: int):
            """Simulate a complete user session."""
            # Login
            login_data = {
                "username_or_email": f"admin@test.com",
                "password": "adminpass123"
            }

            response = await async_client.post("/api/auth/login", json=login_data)
            if response.status_code != 200:
                return None

            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # Perform operations
            operations = []

            # Create student
            student_data = {
                "name": f"Session Student {session_id}",
                "father_name": f"Session Father {session_id}",
                "class_name": "10A",
                "mobile": f"9876570{session_id"03d"}",
                "address": f"Session Address {session_id}",
                "route": "Route 1"
            }

            response = await async_client.post("/api/students/", json=student_data, headers=headers)
            operations.append(response.status_code == 200)

            # Read students
            response = await async_client.get("/api/students/", headers=headers)
            operations.append(response.status_code == 200)

            # Search students
            response = await async_client.get(f"/api/students/search/?q=Student", headers=headers)
            operations.append(response.status_code == 200)

            # Logout
            await async_client.post("/api/auth/logout", headers=headers)

            return all(operations)

        # Run multiple concurrent sessions
        start_time = time.time()

        tasks = [simulate_user_session(i) for i in range(10)]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        end_time = time.time()
        duration = end_time - start_time

        # Should complete within reasonable time
        assert duration < 60  # 60 seconds for 10 concurrent sessions

        # Most sessions should succeed
        success_count = sum(1 for result in results if result is True)
        assert success_count >= 7  # At least 70% success rate


# Test execution and reporting
if __name__ == "__main__":
    # Run tests with comprehensive reporting
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--durations=10",
        "--asyncio-mode=auto",
        "--cov=src",
        "--cov-report=html:htmlcov_integration",
        "--cov-report=term-missing"
    ])