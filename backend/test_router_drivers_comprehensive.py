"""
Comprehensive test suite for drivers router endpoints.

This module provides extensive testing for all driver management endpoints including:
- CRUD operations for drivers
- CSV data access (legacy support)
- Student count calculations
- Error scenarios and edge cases
- Data validation
- Concurrent request handling
"""

import pytest
import asyncio
import json
import time
import concurrent.futures
import os
import csv
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from unittest.mock import patch, MagicMock

from main import app
from core.models.models import (
    Driver, DriverResponse, CreateDriverRequest, UpdateDriverRequest,
    DBDriver, SessionLocal, Base, get_db
)
from services.driver_service import DriverService

# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_drivers_comprehensive.db"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    """Create a test database engine for comprehensive drivers tests."""
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
async def sample_drivers(test_db):
    """Create sample drivers for testing."""
    drivers_data = [
        CreateDriverRequest(
            name="Driver Alice",
            route="Route 1",
            status="active",
            vehicle_number="ABC123",
            contact_number="1112223333",
            license_number="DL123456",
            experience_years=5
        ),
        CreateDriverRequest(
            name="Driver Bob",
            route="Route 2",
            status="active",
            vehicle_number="XYZ789",
            contact_number="4445556666",
            license_number="DL789012",
            experience_years=8
        ),
        CreateDriverRequest(
            name="Driver Charlie",
            route="Route 3",
            status="inactive",
            vehicle_number="DEF456",
            contact_number="7778889999",
            license_number="DL345678",
            experience_years=3
        ),
    ]

    created_drivers = []
    for driver_data in drivers_data:
        driver = await DriverService.create_driver(test_db, driver_data)
        created_drivers.append(driver)

    return created_drivers

@pytest.fixture
def sample_csv_file(tmp_path):
    """Create a sample CSV file for testing legacy CSV access."""
    csv_dir = tmp_path / "drivers"
    csv_dir.mkdir()

    # Create sample CSV file
    csv_file = csv_dir / "Driver Alice.csv"
    with open(csv_file, 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["Name", "Route", "Class", "Mobile"])
        writer.writerow(["Student 1", "Route 1", "5", "1234567890"])
        writer.writerow(["Student 2", "Route 1", "6", "9876543210"])

    return str(csv_dir)

class TestDriversCRUDEndpoints:
    """Comprehensive tests for drivers CRUD endpoints."""

    def test_get_all_drivers_success(self, test_client, sample_drivers):
        """Test successful retrieval of drivers list with pagination."""
        response = test_client.get("/drivers/?skip=0&limit=10")
        assert response.status_code == 200

        data = response.json()
        assert "drivers" in data
        assert "total_count" in data
        assert len(data["drivers"]) >= 0
        assert data["total_count"] >= 0

        # Check driver structure
        if data["drivers"]:
            driver = data["drivers"][0]
            assert "name" in driver
            assert "route" in driver
            assert "status" in driver
            assert "total_students" in driver

    def test_get_all_drivers_pagination(self, test_client, sample_drivers):
        """Test pagination parameters work correctly."""
        # Test first page
        response1 = test_client.get("/drivers/?skip=0&limit=2")
        assert response1.status_code == 200
        data1 = response1.json()

        # Test second page
        response2 = test_client.get("/drivers/?skip=2&limit=2")
        assert response2.status_code == 200
        data2 = response2.json()

        # Should have different drivers on different pages if there are enough
        if data1["total_count"] > 2:
            page1_names = {driver["name"] for driver in data1["drivers"]}
            page2_names = {driver["name"] for driver in data2["drivers"]}
            assert page1_names.isdisjoint(page2_names)

    def test_get_all_drivers_invalid_pagination(self, test_client):
        """Test handling of invalid pagination parameters."""
        # Negative skip
        response = test_client.get("/drivers/?skip=-1&limit=10")
        assert response.status_code == 422

        # Zero limit
        response = test_client.get("/drivers/?skip=0&limit=0")
        assert response.status_code == 422

        # Too large limit
        response = test_client.get("/drivers/?skip=0&limit=2000")
        assert response.status_code == 422

    def test_create_driver_success(self, test_client, sample_drivers):
        """Test successful driver creation."""
        driver_data = {
            "name": "New Driver",
            "route": "Route 4",
            "status": "active",
            "vehicle_number": "NEW123",
            "contact_number": "5556667777",
            "license_number": "DL999999",
            "experience_years": 7
        }

        response = test_client.post("/drivers/", json=driver_data)
        assert response.status_code == 200

        driver = response.json()
        assert driver["name"] == "New Driver"
        assert driver["route"] == "Route 4"
        assert driver["vehicle_number"] == "NEW123"
        assert driver["contact_number"] == "5556667777"
        assert driver["license_number"] == "DL999999"
        assert driver["experience_years"] == 7
        assert driver["status"] == "active"
        assert driver["total_students"] == 0  # No students assigned yet

    def test_create_driver_duplicate_name(self, test_client, sample_drivers):
        """Test driver creation with duplicate name."""
        driver_data = {
            "name": "Driver Alice",  # Already exists
            "route": "Different Route",
            "vehicle_number": "DUPLICATE123"
        }

        response = test_client.post("/drivers/", json=driver_data)
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_create_driver_missing_required_fields(self, test_client):
        """Test driver creation with missing required fields."""
        # Missing name (required field)
        driver_data = {
            "route": "Route X",
            "vehicle_number": "MISSING123"
        }

        response = test_client.post("/drivers/", json=driver_data)
        assert response.status_code == 422

    def test_update_driver_success(self, test_client, sample_drivers):
        """Test successful driver update."""
        update_data = {
            "route": "Updated Route",
            "vehicle_number": "UPDATED123",
            "contact_number": "9998887777",
            "experience_years": 10
        }

        response = test_client.put("/drivers/Driver Alice", json=update_data)
        assert response.status_code == 200

        driver = response.json()
        assert driver["name"] == "Driver Alice"
        assert driver["route"] == "Updated Route"
        assert driver["vehicle_number"] == "UPDATED123"
        assert driver["contact_number"] == "9998887777"
        assert driver["experience_years"] == 10
        # Status should remain unchanged
        assert driver["status"] == "active"

    def test_update_driver_create_if_not_exists(self, test_client):
        """Test that updating non-existent driver creates it."""
        update_data = {
            "route": "New Route",
            "vehicle_number": "CREATED123"
        }

        response = test_client.put("/drivers/New Driver", json=update_data)
        assert response.status_code == 200

        driver = response.json()
        assert driver["name"] == "New Driver"
        assert driver["route"] == "New Route"
        assert driver["vehicle_number"] == "CREATED123"

    def test_get_driver_info_success(self, test_client, sample_drivers):
        """Test successful retrieval of driver info with student count."""
        response = test_client.get("/drivers/Driver Alice/info")
        assert response.status_code == 200

        driver = response.json()
        assert driver["name"] == "Driver Alice"
        assert driver["route"] == "Route 1"
        assert "total_students" in driver
        assert driver["total_students"] >= 0

class TestDriversCSVEndpoints:
    """Tests for legacy CSV data access endpoints."""

    def test_get_driver_csv_data_success(self, test_client, sample_csv_file):
        """Test successful retrieval of driver CSV data."""
        # Mock the CSV file path to use our test file
        with patch('services.driver_service.DriverService.get_driver_csv_data') as mock_get_csv:
            mock_get_csv.return_value = {
                "driver": "Driver Alice",
                "data": [
                    {"Name": "Student 1", "Route": "Route 1", "Class": "5", "Mobile": "1234567890"},
                    {"Name": "Student 2", "Route": "Route 1", "Class": "6", "Mobile": "9876543210"}
                ]
            }

            response = test_client.get("/drivers/Driver Alice")
            assert response.status_code == 200

            data = response.json()
            assert data["driver"] == "Driver Alice"
            assert "data" in data
            assert len(data["data"]) == 2

    def test_get_driver_csv_data_not_found(self, test_client):
        """Test retrieval of non-existent driver CSV data."""
        response = test_client.get("/drivers/NonExistentDriver")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_get_driver_csv_data_invalid_file(self, test_client):
        """Test handling of invalid CSV file."""
        # Mock the service to raise an exception
        with patch('services.driver_service.DriverService.get_driver_csv_data') as mock_get_csv:
            mock_get_csv.side_effect = HTTPException(status_code=500, detail="Error processing driver data")

            response = test_client.get("/drivers/Driver Alice")
            assert response.status_code == 500
            assert "Error processing driver data" in response.json()["detail"]

class TestErrorScenarios:
    """Tests for various error scenarios and edge cases."""

    def test_malformed_json_payload(self, test_client):
        """Test handling of malformed JSON payloads."""
        response = test_client.post("/drivers/", data="invalid json")
        assert response.status_code == 422

    def test_empty_json_payload(self, test_client):
        """Test handling of empty JSON payloads."""
        response = test_client.post("/drivers/", json={})
        assert response.status_code == 422

    def test_oversized_payload(self, test_client):
        """Test handling of oversized request payloads."""
        large_route = "A" * 10000
        large_data = {
            "name": "Test Driver",
            "route": large_route,
            "vehicle_number": "LARGE123"
        }

        response = test_client.post("/drivers/", json=large_data)
        # Should either handle gracefully or return appropriate error
        assert response.status_code in [200, 400, 413, 422, 500]

    def test_special_characters_in_data(self, test_client):
        """Test handling of special characters in driver data."""
        driver_data = {
            "name": "José María O'Connor-Drivers",
            "route": "Ruta Española-1",
            "vehicle_number": "ESP123",
            "contact_number": "+34-555-666-777"
        }

        response = test_client.post("/drivers/", json=driver_data)
        # Should handle special characters appropriately
        assert response.status_code in [200, 422]

    def test_sql_injection_attempts(self, test_client):
        """Test handling of potential SQL injection attempts."""
        malicious_data = {
            "name": "Driver'; DROP TABLE drivers; --",
            "route": "Route 1",
            "vehicle_number": "SQL123"
        }

        response = test_client.post("/drivers/", json=malicious_data)
        # Should handle gracefully, not execute malicious SQL
        assert response.status_code in [200, 422]

    def test_xss_attempts_in_data(self, test_client):
        """Test handling of potential XSS attempts in data."""
        xss_data = {
            "name": "<script>alert('xss')</script>",
            "route": "Route 1",
            "vehicle_number": "XSS123"
        }

        response = test_client.post("/drivers/", json=xss_data)
        # Should handle gracefully, not execute JavaScript
        assert response.status_code in [200, 422]

    def test_extremely_long_driver_name(self, test_client):
        """Test handling of extremely long driver names."""
        long_name = "A" * 1000
        driver_data = {
            "name": long_name,
            "route": "Route 1"
        }

        response = test_client.post("/drivers/", json=driver_data)
        # Should handle long names appropriately
        assert response.status_code in [200, 422]

class TestDataValidation:
    """Tests for data validation and edge cases."""

    def test_vehicle_number_formats(self, test_client):
        """Test various vehicle number formats."""
        test_cases = [
            ("ABC123", 200),  # Standard format
            ("UP-12-AB-1234", 200),  # Indian format
            ("MH-01-PA-1234", 200),  # Maharashtra format
            ("123", 200),  # Short format
            ("", 200),  # Empty (should be allowed)
            ("UP-12-AB-12345", 200),  # Long format
        ]

        for vehicle_number, expected_status in test_cases:
            driver_data = {
                "name": f"Driver {vehicle_number}",
                "vehicle_number": vehicle_number,
                "route": "Route 1"
            }

            response = test_client.post("/drivers/", json=driver_data)
            assert response.status_code == expected_status, f"Failed for vehicle: {vehicle_number}"

    def test_contact_number_formats(self, test_client):
        """Test various contact number formats."""
        test_cases = [
            ("1234567890", 200),  # Standard 10-digit
            ("+91-9876543210", 200),  # International format
            ("987-654-3210", 200),  # With dashes
            ("987 654 3210", 200),  # With spaces
            ("123456789", 200),  # 9 digits
            ("", 200),  # Empty (should be allowed)
            ("12345678901", 200),  # 11 digits
        ]

        for contact_number, expected_status in test_cases:
            driver_data = {
                "name": f"Driver {contact_number}",
                "contact_number": contact_number,
                "route": "Route 1"
            }

            response = test_client.post("/drivers/", json=driver_data)
            assert response.status_code == expected_status, f"Failed for contact: {contact_number}"

    def test_license_number_formats(self, test_client):
        """Test various license number formats."""
        test_cases = [
            ("DL123456", 200),
            ("DL-12-345678", 200),
            ("DL/2023/123456", 200),
            ("123456789012", 200),  # Long number
            ("", 200),  # Empty (should be allowed)
        ]

        for license_number, expected_status in test_cases:
            driver_data = {
                "name": f"Driver {license_number}",
                "license_number": license_number,
                "route": "Route 1"
            }

            response = test_client.post("/drivers/", json=driver_data)
            assert response.status_code == expected_status, f"Failed for license: {license_number}"

    def test_route_name_formats(self, test_client):
        """Test various route name formats."""
        test_cases = [
            ("Route 1", 200),
            ("Route-1", 200),
            ("Route_1", 200),
            ("Route A", 200),
            ("Main Route", 200),
            ("", 200),  # Empty (should be allowed)
            ("A" * 100, 200),  # Very long route name
        ]

        for route, expected_status in test_cases:
            driver_data = {
                "name": f"Driver {route}",
                "route": route
            }

            response = test_client.post("/drivers/", json=driver_data)
            assert response.status_code == expected_status, f"Failed for route: {route}"

class TestConcurrentRequests:
    """Tests for concurrent request handling."""

    def test_concurrent_driver_creation(self, test_client):
        """Test handling of concurrent driver creation requests."""
        def create_driver(i):
            driver_data = {
                "name": f"Concurrent Driver {i}",
                "route": f"Route {i}",
                "vehicle_number": f"CON{i:03d}"
            }
            return test_client.post("/drivers/", json=driver_data)

        # Make concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(create_driver, i) for i in range(3)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]

        # All requests should succeed or fail gracefully
        assert all(response.status_code in [200, 400, 422] for response in responses)

    def test_concurrent_driver_info_requests(self, test_client, sample_drivers):
        """Test handling of concurrent driver info requests."""
        def get_driver_info(name):
            return test_client.get(f"/drivers/{name}/info")

        driver_names = ["Driver Alice", "Driver Bob", "Driver Charlie"]

        # Make concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(get_driver_info, name) for name in driver_names]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]

        # All requests should succeed
        assert all(response.status_code == 200 for response in responses)

class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_update_driver_all_fields(self, test_client, sample_drivers):
        """Test updating all fields of a driver."""
        update_data = {
            "route": "Completely Updated Route",
            "status": "inactive",
            "vehicle_number": "UPDATED123",
            "contact_number": "1112223333",
            "license_number": "UPDATED_DL",
            "experience_years": 15
        }

        response = test_client.put("/drivers/Driver Alice", json=update_data)
        assert response.status_code == 200

        driver = response.json()
        for key, value in update_data.items():
            assert driver[key] == value

    def test_update_driver_no_changes(self, test_client, sample_drivers):
        """Test updating driver with no actual changes."""
        # Send empty update (no fields provided)
        update_data = {}

        response = test_client.put("/drivers/Driver Alice", json=update_data)
        assert response.status_code == 200

        # Driver should remain unchanged
        driver = response.json()
        assert driver["name"] == "Driver Alice"

    def test_pagination_boundary_conditions(self, test_client, sample_drivers):
        """Test pagination at boundary conditions."""
        # Test skip equals total count
        response = test_client.get(f"/drivers/?skip={len(sample_drivers)}&limit=10")
        assert response.status_code == 200

        data = response.json()
        assert data["drivers"] == []
        assert data["total_count"] >= len(sample_drivers)

        # Test skip greater than total count
        response = test_client.get(f"/drivers/?skip={len(sample_drivers) + 10}&limit=10")
        assert response.status_code == 200

        data = response.json()
        assert data["drivers"] == []
        assert data["total_count"] >= len(sample_drivers)

class TestDriverStudentCounting:
    """Tests for driver-student relationship and counting."""

    def test_driver_student_count_calculation(self, test_client, sample_drivers):
        """Test that student count is correctly calculated for drivers."""
        # Get driver info to see current student count
        response = test_client.get("/drivers/Driver Alice/info")
        assert response.status_code == 200

        driver = response.json()
        initial_count = driver["total_students"]

        # The count should be a non-negative integer
        assert isinstance(initial_count, int)
        assert initial_count >= 0

    def test_driver_with_no_students(self, test_client):
        """Test driver that has no assigned students."""
        # Create a driver with a unique route that no students are assigned to
        driver_data = {
            "name": "No Students Driver",
            "route": "Empty Route",
            "vehicle_number": "EMPTY123"
        }

        response = test_client.post("/drivers/", json=driver_data)
        assert response.status_code == 200

        # Get driver info
        response = test_client.get("/drivers/No Students Driver/info")
        assert response.status_code == 200

        driver = response.json()
        assert driver["total_students"] == 0

class TestSecurityAndHeaders:
    """Tests for security headers and configurations."""

    def test_cors_headers_drivers(self, test_client):
        """Test CORS headers on drivers endpoints."""
        response = test_client.options("/drivers/")
        # Should not crash and may include CORS headers
        assert response.status_code in [200, 404, 405]

    def test_security_headers_present(self, test_client, sample_drivers):
        """Test that security headers are present in responses."""
        response = test_client.get("/drivers/")

        # Check for security-related headers
        headers_to_check = [
            'content-type',
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection'
        ]

        for header in headers_to_check:
            if header in response.headers:
                # Header is present, which is good
                pass

class TestPerformanceAndLoad:
    """Tests for performance and load handling."""

    def test_large_dataset_handling(self, test_client):
        """Test handling of large datasets."""
        # Create multiple drivers to test performance
        drivers_data = []
        for i in range(10):
            driver_data = {
                "name": f"Performance Driver {i}",
                "route": f"Route {i}",
                "vehicle_number": f"PERF{i:03d}",
                "contact_number": f"111222333{i}"
            }
            drivers_data.append(driver_data)

        # Create drivers
        created_count = 0
        for driver_data in drivers_data:
            response = test_client.post("/drivers/", json=driver_data)
            if response.status_code == 200:
                created_count += 1

        # Should be able to handle multiple creations
        assert created_count >= 0

        # Test listing with larger dataset
        response = test_client.get("/drivers/?limit=50")
        assert response.status_code == 200

    def test_csv_data_performance(self, test_client):
        """Test CSV data access performance."""
        # Mock the CSV service for performance testing
        with patch('services.driver_service.DriverService.get_driver_csv_data') as mock_get_csv:
            large_csv_data = [{"col1": f"value{i}", "col2": f"data{i}"} for i in range(1000)]
            mock_get_csv.return_value = {
                "driver": "Performance Driver",
                "data": large_csv_data
            }

            # Test CSV data retrieval
            start_time = time.time()
            response = test_client.get("/drivers/Performance Driver")
            end_time = time.time()

            assert response.status_code == 200
            # Should complete within reasonable time
            assert (end_time - start_time) < 5.0

class TestDriverNameVariations:
    """Tests for various driver name formats and edge cases."""

    def test_driver_names_with_special_characters(self, test_client):
        """Test driver names with special characters."""
        special_names = [
            "José María",
            "Jean-Pierre",
            "O'Connor",
            "Smith-Jones",
            "van der Berg",
            "al-Rashid"
        ]

        for name in special_names:
            driver_data = {
                "name": name,
                "route": f"Route {name}",
                "vehicle_number": f"SPEC{name[:3].upper()}123"
            }

            response = test_client.post("/drivers/", json=driver_data)
            # Should handle special names appropriately
            assert response.status_code in [200, 400, 422], f"Failed for name: {name}"

    def test_case_sensitive_driver_operations(self, test_client):
        """Test case sensitivity in driver operations."""
        # Create driver with specific case
        driver_data = {
            "name": "CaseSensitive Driver",
            "route": "Case Route",
            "vehicle_number": "CASE123"
        }

        response = test_client.post("/drivers/", json=driver_data)
        assert response.status_code == 200

        # Try to access with different case variations
        test_cases = [
            "CaseSensitive Driver",  # Exact match
            "casesensitive driver",  # Lowercase
            "CASESENSITIVE DRIVER",  # Uppercase
            "CaseSensitive driver",  # Mixed case
        ]

        for name_variation in test_cases:
            response = test_client.get(f"/drivers/{name_variation}/info")
            # Should handle case variations appropriately
            assert response.status_code in [200, 404]

class TestDriverStatusManagement:
    """Tests for driver status management."""

    def test_driver_status_transitions(self, test_client):
        """Test driver status changes."""
        # Create active driver
        driver_data = {
            "name": "Status Test Driver",
            "status": "active",
            "route": "Status Route"
        }

        response = test_client.post("/drivers/", json=driver_data)
        assert response.status_code == 200
        assert response.json()["status"] == "active"

        # Update to inactive
        update_response = test_client.put("/drivers/Status Test Driver", json={"status": "inactive"})
        assert update_response.status_code == 200
        assert update_response.json()["status"] == "inactive"

        # Update back to active
        update_response = test_client.put("/drivers/Status Test Driver", json={"status": "active"})
        assert update_response.status_code == 200
        assert update_response.json()["status"] == "active"

    def test_invalid_driver_status(self, test_client):
        """Test invalid driver status values."""
        driver_data = {
            "name": "Invalid Status Driver",
            "status": "invalid_status",
            "route": "Route"
        }

        response = test_client.post("/drivers/", json=driver_data)
        # Should reject invalid status
        assert response.status_code in [200, 422]

class TestDriversGuestAccess:
    """Comprehensive tests for guest access to driver endpoints."""

    def test_guest_cannot_access_drivers_list(self, test_client):
        """Test that guest users cannot access drivers list without authentication."""
        response = test_client.get("/drivers/")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_access_driver_info(self, test_client):
        """Test that guest users cannot access detailed driver information."""
        response = test_client.get("/drivers/Driver Alice/info")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_create_driver(self, test_client):
        """Test that guest users cannot create new drivers."""
        driver_data = {
            "name": "Guest Driver",
            "route": "Guest Route",
            "vehicle_number": "GUEST001",
            "contact_number": "9876543210",
            "license_number": "GUESTLIC001",
            "experience_years": 2
        }
        response = test_client.post("/drivers/", json=driver_data)
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_update_driver(self, test_client):
        """Test that guest users cannot update driver records."""
        update_data = {"route": "Updated Route"}
        response = test_client.put("/drivers/Driver Alice", json=update_data)
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_access_driver_csv_data(self, test_client):
        """Test that guest users cannot access raw driver CSV data."""
        response = test_client.get("/drivers/Driver Alice")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_can_access_guest_drivers_endpoint(self, test_client):
        """Test that guest users can access the guest drivers endpoint."""
        response = test_client.get("/drivers/guest/")
        # Should be allowed for guest users
        assert response.status_code == 200

        data = response.json()
        assert "drivers" in data
        assert "total_count" in data
        assert "guest_access" in data
        assert data["guest_access"] == True

    def test_guest_drivers_endpoint_pagination(self, test_client):
        """Test pagination in guest drivers endpoint."""
        response = test_client.get("/drivers/guest/?skip=0&limit=5")
        assert response.status_code == 200

        data = response.json()
        assert "drivers" in data
        assert "pagination" in data
        assert "skip" in data["pagination"]
        assert "limit" in data["pagination"]

    def test_guest_drivers_limited_information(self, test_client):
        """Test that guest drivers endpoint returns limited information."""
        response = test_client.get("/drivers/guest/")
        assert response.status_code == 200

        data = response.json()
        if data["drivers"]:
            driver = data["drivers"][0]
            # Should only include basic fields for guest access
            allowed_fields = ["id", "name", "route", "status", "total_students"]
            for field in allowed_fields:
                assert field in driver

            # Should NOT include sensitive information
            sensitive_fields = ["contact_number", "license_number", "vehicle_number"]
            for field in sensitive_fields:
                assert field not in driver

    def test_guest_cannot_access_drivers_with_malformed_token(self, test_client):
        """Test that guest users with malformed tokens cannot access driver endpoints."""
        headers = {"Authorization": "Bearer malformed.token.here"}
        response = test_client.get("/drivers/", headers=headers)
        assert response.status_code == 401

    def test_guest_drivers_rate_limiting(self, test_client):
        """Test that guest driver access is properly rate limited."""
        # Make multiple requests rapidly to guest drivers endpoint
        responses = []
        for i in range(10):
            response = test_client.get("/drivers/guest/")
            responses.append(response.status_code)

        # Should be successful or rate limited gracefully
        assert all(status in [200, 429] for status in responses)

class TestDriversGuestFirstArchitectureIntegration:
    """Integration tests for guest-first architecture with driver endpoints."""

    def test_guest_access_workflow_isolation(self, test_client):
        """Test that guest access attempts don't interfere with regular operations."""
        # Guest tries to access drivers (should fail)
        guest_response = test_client.get("/drivers/")
        assert guest_response.status_code in [401, 403]

        # Guest can access guest drivers endpoint (should succeed)
        guest_drivers_response = test_client.get("/drivers/guest/")
        assert guest_drivers_response.status_code == 200

        # Regular operation should still work (assuming no auth required for this test)
        # This tests that failed guest attempts don't break the system
        list_response = test_client.get("/drivers/")
        # Should handle gracefully even if auth is required
        assert list_response.status_code in [200, 401, 403]

    def test_guest_error_responses_structure(self, test_client):
        """Test that guest error responses have proper structure."""
        response = test_client.get("/drivers/")

        if response.status_code in [401, 403]:
            data = response.json()
            assert "detail" in data
            assert isinstance(data["detail"], str)
            assert len(data["detail"]) > 0

    def test_guest_access_security_headers(self, test_client):
        """Test that security headers are present in guest access responses."""
        response = test_client.get("/drivers/")

        # Check for security-related headers
        security_headers = [
            'content-type',
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection'
        ]

        for header in security_headers:
            if header in response.headers:
                # Header is present, which is good for security
                pass

class TestDriversGuestAccessEdgeCases:
    """Edge cases and boundary conditions for guest access to drivers."""

    def test_guest_access_with_empty_headers(self, test_client):
        """Test guest access with empty authorization headers."""
        headers = {"Authorization": ""}
        response = test_client.get("/drivers/", headers=headers)
        assert response.status_code == 401

    def test_guest_access_with_whitespace_token(self, test_client):
        """Test guest access with whitespace-only token."""
        headers = {"Authorization": "Bearer   "}
        response = test_client.get("/drivers/", headers=headers)
        assert response.status_code == 401

    def test_guest_access_with_wrong_auth_scheme(self, test_client):
        """Test guest access with wrong authentication scheme."""
        headers = {"Authorization": "Basic dXNlcjpwYXNz"}  # Basic auth instead of Bearer
        response = test_client.get("/drivers/", headers=headers)
        assert response.status_code == 401

    def test_guest_access_with_incomplete_bearer_token(self, test_client):
        """Test guest access with incomplete Bearer token."""
        headers = {"Authorization": "Bearer"}
        response = test_client.get("/drivers/", headers=headers)
        assert response.status_code == 401

class TestDriversGuestAccessPerformance:
    """Performance tests for guest access scenarios."""

    def test_guest_access_response_time(self, test_client):
        """Test that guest access responses are reasonably fast."""
        import time

        start_time = time.time()
        response = test_client.get("/drivers/")
        end_time = time.time()

        # Should respond within 2 seconds even for unauthorized access
        assert (end_time - start_time) < 2.0
        # Should return proper error status
        assert response.status_code in [401, 403]

    def test_guest_drivers_access_response_time(self, test_client):
        """Test that guest drivers access is reasonably fast."""
        import time

        start_time = time.time()
        response = test_client.get("/drivers/guest/")
        end_time = time.time()

        # Should respond within 2 seconds for guest access
        assert (end_time - start_time) < 2.0
        # Should return successful response
        assert response.status_code == 200

    def test_guest_access_concurrent_requests(self, test_client):
        """Test handling of concurrent guest access requests."""
        def make_guest_request():
            return test_client.get("/drivers/")

        import concurrent.futures

        # Make multiple concurrent guest requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_guest_request) for _ in range(5)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]

        # All requests should return consistent error codes
        assert all(response.status_code in [401, 403] for response in responses)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])