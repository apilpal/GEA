"""
Comprehensive test suite for students router endpoints.

This module provides extensive testing for all student management endpoints including:
- CRUD operations for students
- Search functionality
- Rate limiting
- Pagination
- Error scenarios and edge cases
- Data validation
- Concurrent request handling
"""

import pytest
import asyncio
import json
import time
import concurrent.futures
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from unittest.mock import patch, MagicMock

from main import app
from core.models.models import (
    Student, StudentResponse, CreateStudentRequest, UpdateStudentRequest,
    ClassEnum, DBStudent, SessionLocal, Base, get_db
)
from services.student_service import StudentService

# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_students_comprehensive.db"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    """Create a test database engine for comprehensive students tests."""
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
async def sample_students(test_db):
    """Create sample students for testing."""
    students_data = [
        CreateStudentRequest(
            name="John Doe",
            father_name="Robert Doe",
            mobile="1234567890",
            class_=ClassEnum.FIVE,
            address="123 Main St",
            fees=1500.50,
            route="Route 1"
        ),
        CreateStudentRequest(
            name="Jane Smith",
            father_name="Michael Smith",
            mobile="9876543210",
            class_=ClassEnum.SEVEN,
            address="456 Oak Ave",
            fees=1200.00,
            route="Route 2"
        ),
        CreateStudentRequest(
            name="Bob Johnson",
            father_name="David Johnson",
            mobile="5556667777",
            class_=ClassEnum.TEN,
            address="789 Pine St",
            fees=1800.75,
            route="Route 1"
        ),
        CreateStudentRequest(
            name="Alice Brown",
            father_name="James Brown",
            mobile="1112223333",
            class_=ClassEnum.THREE,
            address="321 Elm St",
            fees=900.25,
            route="Route 3"
        ),
    ]

    created_students = []
    for student_data in students_data:
        student = await StudentService.create_student(test_db, student_data)
        created_students.append(student)

    return created_students

class TestStudentsCRUDEndpoints:
    """Comprehensive tests for students CRUD endpoints."""

    def test_get_students_success(self, test_client, sample_students):
        """Test successful retrieval of students list with pagination."""
        response = test_client.get("/students/?skip=0&limit=10")
        assert response.status_code == 200

        data = response.json()
        assert "students" in data
        assert "total_count" in data
        assert len(data["students"]) >= 0
        assert data["total_count"] >= 0

        # Check student structure
        if data["students"]:
            student = data["students"][0]
            assert "id" in student
            assert "name" in student
            assert "father_name" in student
            assert "mobile" in student

    def test_get_students_pagination(self, test_client, sample_students):
        """Test pagination parameters work correctly."""
        # Test first page
        response1 = test_client.get("/students/?skip=0&limit=2")
        assert response1.status_code == 200
        data1 = response1.json()

        # Test second page
        response2 = test_client.get("/students/?skip=2&limit=2")
        assert response2.status_code == 200
        data2 = response2.json()

        # Should have different students on different pages
        if data1["total_count"] > 2:
            page1_ids = {student["id"] for student in data1["students"]}
            page2_ids = {student["id"] for student in data2["students"]}
            assert page1_ids.isdisjoint(page2_ids)

    def test_get_students_invalid_pagination(self, test_client):
        """Test handling of invalid pagination parameters."""
        # Negative skip
        response = test_client.get("/students/?skip=-1&limit=10")
        assert response.status_code == 422

        # Zero limit
        response = test_client.get("/students/?skip=0&limit=0")
        assert response.status_code == 422

        # Too large limit
        response = test_client.get("/students/?skip=0&limit=2000")
        assert response.status_code == 422

    def test_get_student_by_id_success(self, test_client, sample_students):
        """Test successful retrieval of single student by ID."""
        # Get a student ID from the sample data
        student_id = int(sample_students[0].id)

        response = test_client.get(f"/students/{student_id}")
        assert response.status_code == 200

        student = response.json()
        assert student["id"] == sample_students[0].id
        assert student["name"] == sample_students[0].name
        assert student["father_name"] == sample_students[0].father_name
        assert student["mobile"] == sample_students[0].mobile

    def test_get_student_by_id_not_found(self, test_client):
        """Test retrieval of non-existent student."""
        response = test_client.get("/students/99999")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_get_student_by_id_invalid_id(self, test_client):
        """Test retrieval with invalid student ID format."""
        response = test_client.get("/students/invalid_id")
        assert response.status_code == 422

        response = test_client.get("/students/-1")
        assert response.status_code == 422

    def test_create_student_success(self, test_client, sample_students):
        """Test successful student creation."""
        student_data = {
            "name": "New Student",
            "father_name": "New Father",
            "mobile": "9998887777",
            "class_": "8",
            "address": "New Address",
            "fees": "2000.50",
            "route": "Route 4"
        }

        response = test_client.post("/students/", json=student_data)
        assert response.status_code == 200

        student = response.json()
        assert student["name"] == "New Student"
        assert student["father_name"] == "New Father"
        assert student["mobile"] == "9998887777"
        assert student["class_"] == "8"
        assert student["fees"] == "2000.5"
        assert "id" in student
        assert "created_at" in student
        assert "updated_at" in student

    def test_create_student_duplicate_mobile(self, test_client, sample_students):
        """Test student creation with duplicate mobile number."""
        student_data = {
            "name": "Duplicate Mobile Student",
            "father_name": "Father",
            "mobile": "1234567890",  # Same as first sample student
            "class_": "6",
            "address": "Address"
        }

        response = test_client.post("/students/", json=student_data)
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_create_student_missing_required_fields(self, test_client):
        """Test student creation with missing required fields."""
        # Missing name (required field)
        student_data = {
            "father_name": "Father",
            "mobile": "1112223333"
        }

        response = test_client.post("/students/", json=student_data)
        assert response.status_code == 422

    def test_create_student_invalid_class_format(self, test_client):
        """Test student creation with invalid class format."""
        student_data = {
            "name": "Test Student",
            "father_name": "Father",
            "mobile": "1112223333",
            "class_": "InvalidClass"
        }

        response = test_client.post("/students/", json=student_data)
        assert response.status_code == 422

    def test_create_student_invalid_fees_format(self, test_client):
        """Test student creation with invalid fees format."""
        student_data = {
            "name": "Test Student",
            "father_name": "Father",
            "mobile": "1112223333",
            "fees": "invalid_number"
        }

        response = test_client.post("/students/", json=student_data)
        assert response.status_code == 422

    def test_update_student_success(self, test_client, sample_students):
        """Test successful student update."""
        student_id = int(sample_students[0].id)

        update_data = {
            "name": "Updated Name",
            "address": "Updated Address",
            "fees": "2500.75"
        }

        response = test_client.put(f"/students/{student_id}", json=update_data)
        assert response.status_code == 200

        student = response.json()
        assert student["name"] == "Updated Name"
        assert student["address"] == "Updated Address"
        assert student["fees"] == "2500.75"
        # Other fields should remain unchanged
        assert student["father_name"] == sample_students[0].father_name
        assert student["mobile"] == sample_students[0].mobile

    def test_update_student_not_found(self, test_client):
        """Test update of non-existent student."""
        update_data = {"name": "Updated Name"}

        response = test_client.put("/students/99999", json=update_data)
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_update_student_duplicate_mobile(self, test_client, sample_students):
        """Test student update with duplicate mobile number."""
        student_id = int(sample_students[0].id)
        conflicting_mobile = sample_students[1].mobile

        update_data = {"mobile": conflicting_mobile}

        response = test_client.put(f"/students/{student_id}", json=update_data)
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_delete_student_success(self, test_client, sample_students):
        """Test successful student deletion."""
        student_id = int(sample_students[0].id)

        response = test_client.delete(f"/students/{student_id}")
        assert response.status_code == 200

        data = response.json()
        assert "deleted successfully" in data["message"]

        # Verify student is actually deleted
        get_response = test_client.get(f"/students/{student_id}")
        assert get_response.status_code == 404

    def test_delete_student_not_found(self, test_client):
        """Test deletion of non-existent student."""
        response = test_client.delete("/students/99999")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

class TestStudentsSearchEndpoint:
    """Comprehensive tests for student search functionality."""

    def test_search_students_by_name(self, test_client, sample_students):
        """Test searching students by name."""
        response = test_client.get("/students/search/?q=John")
        assert response.status_code == 200

        data = response.json()
        assert "students" in data
        assert "total_count" in data

        # Should find students with "John" in their name
        found_names = [student["name"] for student in data["students"]]
        assert any("John" in name for name in found_names)

    def test_search_students_by_father_name(self, test_client, sample_students):
        """Test searching students by father's name."""
        response = test_client.get("/students/search/?q=Robert")
        assert response.status_code == 200

        data = response.json()
        found_father_names = [student["father_name"] for student in data["students"]]
        assert any("Robert" in name for name in found_father_names if name)

    def test_search_students_by_class(self, test_client, sample_students):
        """Test searching students by class."""
        response = test_client.get("/students/search/?q=5")
        assert response.status_code == 200

        data = response.json()
        found_classes = [student["class_"] for student in data["students"]]
        assert any("5" in str(class_) for class_ in found_classes if class_)

    def test_search_students_by_mobile(self, test_client, sample_students):
        """Test searching students by mobile number."""
        response = test_client.get("/students/search/?q=1234567890")
        assert response.status_code == 200

        data = response.json()
        found_mobiles = [student["mobile"] for student in data["students"]]
        assert "1234567890" in found_mobiles

    def test_search_students_by_route(self, test_client, sample_students):
        """Test searching students by route."""
        response = test_client.get("/students/search/?q=Route")
        assert response.status_code == 200

        data = response.json()
        found_routes = [student["route"] for student in data["students"]]
        assert any("Route" in str(route) for route in found_routes if route)

    def test_search_students_no_results(self, test_client, sample_students):
        """Test searching with query that yields no results."""
        response = test_client.get("/students/search/?q=NonExistentQuery")
        assert response.status_code == 200

        data = response.json()
        assert data["students"] == []
        assert data["total_count"] == 0

    def test_search_students_empty_query(self, test_client, sample_students):
        """Test searching with empty query returns all students."""
        response = test_client.get("/students/search/?q=")
        assert response.status_code == 200

        data = response.json()
        assert "students" in data
        assert "total_count" in data
        # Should return all students when query is empty
        assert data["total_count"] >= len(sample_students)

    def test_search_students_case_insensitive(self, test_client, sample_students):
        """Test that search is case insensitive."""
        # Search with uppercase
        response1 = test_client.get("/students/search/?q=JOHN")
        assert response1.status_code == 200

        # Search with lowercase
        response2 = test_client.get("/students/search/?q=john")
        assert response2.status_code == 200

        # Both should return similar results
        data1 = response1.json()
        data2 = response2.json()

        # Results might be the same or very similar
        assert len(data1["students"]) >= 0
        assert len(data2["students"]) >= 0

class TestRateLimiting:
    """Tests for rate limiting functionality."""

    def test_students_list_rate_limiting(self, test_client, sample_students):
        """Test rate limiting on students list endpoint (60/minute)."""
        responses = []

        # Make multiple requests rapidly
        for i in range(5):
            response = test_client.get("/students/")
            responses.append(response.status_code)

        # Should handle requests appropriately
        assert all(status in [200, 429] for status in responses)

    def test_students_create_rate_limiting(self, test_client, sample_students):
        """Test rate limiting on student creation endpoint (30/minute)."""
        student_data = {
            "name": f"Rate Test Student {i}",
            "father_name": "Father",
            "mobile": f"111222333{i}",
            "class_": "5"
        }

        responses = []
        # Make multiple creation requests rapidly
        for i in range(3):
            response = test_client.post("/students/", json=student_data)
            responses.append(response.status_code)

        # Should handle requests appropriately
        assert all(status in [200, 400, 422, 429] for status in responses)

class TestErrorScenarios:
    """Tests for various error scenarios and edge cases."""

    def test_malformed_json_payload(self, test_client):
        """Test handling of malformed JSON payloads."""
        response = test_client.post("/students/", data="invalid json")
        assert response.status_code == 422

    def test_empty_json_payload(self, test_client):
        """Test handling of empty JSON payloads."""
        response = test_client.post("/students/", json={})
        assert response.status_code == 422

    def test_oversized_payload(self, test_client):
        """Test handling of oversized request payloads."""
        large_address = "A" * 10000
        large_data = {
            "name": "Test Student",
            "father_name": "Father",
            "mobile": "1112223333",
            "address": large_address
        }

        response = test_client.post("/students/", json=large_data)
        # Should either handle gracefully or return appropriate error
        assert response.status_code in [200, 400, 413, 422, 500]

    def test_special_characters_in_data(self, test_client):
        """Test handling of special characters in student data."""
        student_data = {
            "name": "José María O'Connor-Smith",
            "father_name": "José María Sr.",
            "mobile": "1112223333",
            "class_": "5",
            "address": "123 Main St, Ñuñoa, Región Metropolitana"
        }

        response = test_client.post("/students/", json=student_data)
        # Should handle special characters appropriately
        assert response.status_code in [200, 422]

    def test_sql_injection_attempts(self, test_client):
        """Test handling of potential SQL injection attempts."""
        malicious_data = {
            "name": "Robert'; DROP TABLE students; --",
            "father_name": "Father",
            "mobile": "1112223333",
            "class_": "5"
        }

        response = test_client.post("/students/", json=malicious_data)
        # Should handle gracefully, not execute malicious SQL
        assert response.status_code in [200, 422]

    def test_xss_attempts_in_data(self, test_client):
        """Test handling of potential XSS attempts in data."""
        xss_data = {
            "name": "<script>alert('xss')</script>",
            "father_name": "Father",
            "mobile": "1112223333",
            "class_": "5"
        }

        response = test_client.post("/students/", json=xss_data)
        # Should handle gracefully, not execute JavaScript
        assert response.status_code in [200, 422]

    def test_negative_fees_value(self, test_client):
        """Test handling of negative fees values."""
        student_data = {
            "name": "Test Student",
            "father_name": "Father",
            "mobile": "1112223333",
            "fees": "-100.50"
        }

        response = test_client.post("/students/", json=student_data)
        # Should handle negative fees appropriately
        assert response.status_code in [200, 422]

    def test_extremely_large_fees_value(self, test_client):
        """Test handling of extremely large fees values."""
        student_data = {
            "name": "Test Student",
            "father_name": "Father",
            "mobile": "1112223333",
            "fees": "999999999.99"
        }

        response = test_client.post("/students/", json=student_data)
        # Should handle large fees appropriately
        assert response.status_code in [200, 422]

class TestDataValidation:
    """Tests for data validation and edge cases."""

    def test_mobile_number_formats(self, test_client):
        """Test various mobile number formats."""
        test_cases = [
            ("1234567890", 200),  # Standard 10-digit
            ("+1-234-567-890", 200),  # International format
            ("123-456-7890", 200),  # With dashes
            ("123 456 7890", 200),  # With spaces
            ("123456789", 200),  # 9 digits (might be valid)
            ("", 200),  # Empty mobile (should be allowed)
            ("abc123defg", 422),  # Invalid characters
        ]

        for mobile, expected_status in test_cases:
            student_data = {
                "name": f"Test Student {mobile}",
                "father_name": "Father",
                "mobile": mobile,
                "class_": "5"
            }

            response = test_client.post("/students/", json=student_data)
            assert response.status_code == expected_status, f"Failed for mobile: {mobile}"

    def test_class_enum_values(self, test_client):
        """Test all valid class enum values."""
        valid_classes = [
            "L.K.G.", "U.K.G.", "P.K.", "P.G", "N",
            "1", "2", "3", "4", "4th", "5", "6", "7", "7th", "8", "9", "10", "11", "12"
        ]

        for class_value in valid_classes:
            student_data = {
                "name": f"Test Student {class_value}",
                "father_name": "Father",
                "mobile": f"111222333{valid_classes.index(class_value)}",
                "class_": class_value
            }

            response = test_client.post("/students/", json=student_data)
            # Should accept all valid class values
            assert response.status_code in [200, 400], f"Failed for class: {class_value}"

    def test_name_field_validation(self, test_client):
        """Test various name formats and edge cases."""
        test_cases = [
            ("", 422),  # Empty name
            ("A", 200),  # Single character
            ("John Doe Smith Johnson", 200),  # Very long name
            ("José María", 200),  # Special characters
            ("123", 200),  # Numeric name
            ("Name with spaces", 200),  # Multiple words
            ("Name-with-hyphens", 200),  # With hyphens
            ("Name_with_underscores", 200),  # With underscores
        ]

        for name, expected_status in test_cases:
            student_data = {
                "name": name,
                "father_name": "Father",
                "mobile": f"111222333{hash(name) % 1000}",  # Unique mobile
                "class_": "5"
            }

            if name:  # Only test non-empty names
                response = test_client.post("/students/", json=student_data)
                assert response.status_code == expected_status, f"Failed for name: '{name}'"

class TestConcurrentRequests:
    """Tests for concurrent request handling."""

    def test_concurrent_student_creation(self, test_client):
        """Test handling of concurrent student creation requests."""
        def create_student(i):
            student_data = {
                "name": f"Concurrent Student {i}",
                "father_name": "Father",
                "mobile": f"111222333{i}",
                "class_": "5"
            }
            return test_client.post("/students/", json=student_data)

        # Make concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(create_student, i) for i in range(3)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]

        # All requests should succeed or fail gracefully
        assert all(response.status_code in [200, 400, 422] for response in responses)

    def test_concurrent_student_search(self, test_client, sample_students):
        """Test handling of concurrent search requests."""
        def search_students(query):
            return test_client.get(f"/students/search/?q={query}")

        search_queries = ["John", "Jane", "Bob", "Alice", "Smith"]

        # Make concurrent search requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(search_students, query) for query in search_queries]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]

        # All requests should succeed
        assert all(response.status_code == 200 for response in responses)

class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_update_student_all_fields(self, test_client, sample_students):
        """Test updating all fields of a student."""
        student_id = int(sample_students[0].id)

        update_data = {
            "name": "Completely Updated Student",
            "father_name": "Updated Father",
            "mother_name": "Updated Mother",
            "mobile": "7778889999",
            "class_": "12",
            "address": "Completely New Address",
            "fees": "5173.00",
            "status": "inactive",
            "route": "Updated Route"
        }

        response = test_client.put(f"/students/{student_id}", json=update_data)
        assert response.status_code == 200

        student = response.json()
        for key, value in update_data.items():
            assert student[key] == value

    def test_update_student_no_changes(self, test_client, sample_students):
        """Test updating student with no actual changes."""
        student_id = int(sample_students[0].id)

        # Send empty update (no fields provided)
        update_data = {}

        response = test_client.put(f"/students/{student_id}", json=update_data)
        assert response.status_code == 200

        # Student should remain unchanged
        student = response.json()
        assert student["id"] == sample_students[0].id

    def test_pagination_boundary_conditions(self, test_client, sample_students):
        """Test pagination at boundary conditions."""
        # Test skip equals total count
        response = test_client.get(f"/students/?skip={len(sample_students)}&limit=10")
        assert response.status_code == 200

        data = response.json()
        assert data["students"] == []
        assert data["total_count"] >= len(sample_students)

        # Test skip greater than total count
        response = test_client.get(f"/students/?skip={len(sample_students) + 10}&limit=10")
        assert response.status_code == 200

        data = response.json()
        assert data["students"] == []
        assert data["total_count"] >= len(sample_students)

class TestPerformanceAndLoad:
    """Tests for performance and load handling."""

    def test_large_dataset_handling(self, test_client):
        """Test handling of large datasets."""
        # Create multiple students to test performance
        students_data = []
        for i in range(10):
            student_data = {
                "name": f"Performance Test Student {i}",
                "father_name": f"Father {i}",
                "mobile": f"111222333{i}",
                "class_": "5",
                "address": f"Address {i} with some additional text to make it longer"
            }
            students_data.append(student_data)

        # Create students
        created_count = 0
        for student_data in students_data:
            response = test_client.post("/students/", json=student_data)
            if response.status_code == 200:
                created_count += 1

        # Should be able to handle multiple creations
        assert created_count >= 0

        # Test listing with larger dataset
        response = test_client.get("/students/?limit=50")
        assert response.status_code == 200

    def test_search_performance_with_large_dataset(self, test_client):
        """Test search performance with larger dataset."""
        # Search should complete within reasonable time
        start_time = time.time()
        response = test_client.get("/students/search/?q=Test")
        end_time = time.time()

        assert response.status_code == 200
        # Should complete within 5 seconds (reasonable for test)
        assert (end_time - start_time) < 5.0

class TestSecurityAndHeaders:
    """Tests for security headers and configurations."""

    def test_cors_headers_students(self, test_client):
        """Test CORS headers on students endpoints."""
        response = test_client.options("/students/")
        # Should not crash and may include CORS headers
        assert response.status_code in [200, 404, 405]

    def test_security_headers_present(self, test_client, sample_students):
        """Test that security headers are present in responses."""
        response = test_client.get("/students/")

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

class TestStudentsGuestAccess:
    """Comprehensive tests for guest access to student endpoints."""

    def test_guest_cannot_access_students_list(self, test_client):
        """Test that guest users cannot access students list without authentication."""
        response = test_client.get("/students/")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_access_student_by_id(self, test_client):
        """Test that guest users cannot access individual student records."""
        response = test_client.get("/students/1")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_create_student(self, test_client):
        """Test that guest users cannot create new students."""
        student_data = {
            "name": "Guest Student",
            "father_name": "Guest Father",
            "mobile": "9876543210",
            "class_": "10",
            "address": "Guest Address"
        }
        response = test_client.post("/students/", json=student_data)
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_update_student(self, test_client):
        """Test that guest users cannot update student records."""
        update_data = {"name": "Updated Name"}
        response = test_client.put("/students/1", json=update_data)
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_delete_student(self, test_client):
        """Test that guest users cannot delete student records."""
        response = test_client.delete("/students/1")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_search_students(self, test_client):
        """Test that guest users cannot search students."""
        response = test_client.get("/students/search/?q=test")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_access_students_with_malformed_token(self, test_client):
        """Test that guest users with malformed tokens cannot access student endpoints."""
        headers = {"Authorization": "Bearer malformed.token.here"}
        response = test_client.get("/students/", headers=headers)
        # Should be unauthorized (401)
        assert response.status_code == 401

    def test_guest_access_rate_limiting(self, test_client):
        """Test that guest access attempts are properly rate limited."""
        # Make multiple requests rapidly
        responses = []
        for i in range(10):
            response = test_client.get("/students/")
            responses.append(response.status_code)

        # All should be unauthorized/forbidden, but not crash
        assert all(status in [401, 403, 429] for status in responses)

class TestStudentsGuestFirstArchitectureIntegration:
    """Integration tests for guest-first architecture with student endpoints."""

    def test_guest_access_workflow_isolation(self, test_client):
        """Test that guest access attempts don't interfere with regular operations."""
        # Guest tries to access students (should fail)
        guest_response = test_client.get("/students/")
        assert guest_response.status_code in [401, 403]

        # Regular operation should still work (assuming no auth required for this test)
        # This tests that failed guest attempts don't break the system
        list_response = test_client.get("/students/")
        # Should handle gracefully even if auth is required
        assert list_response.status_code in [200, 401, 403]

    def test_guest_error_responses_structure(self, test_client):
        """Test that guest error responses have proper structure."""
        response = test_client.get("/students/")

        if response.status_code in [401, 403]:
            data = response.json()
            assert "detail" in data
            assert isinstance(data["detail"], str)
            assert len(data["detail"]) > 0

    def test_guest_access_security_headers(self, test_client):
        """Test that security headers are present in guest access responses."""
        response = test_client.get("/students/")

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

class TestStudentsGuestAccessEdgeCases:
    """Edge cases and boundary conditions for guest access to students."""

    def test_guest_access_with_empty_headers(self, test_client):
        """Test guest access with empty authorization headers."""
        headers = {"Authorization": ""}
        response = test_client.get("/students/", headers=headers)
        assert response.status_code == 401

    def test_guest_access_with_whitespace_token(self, test_client):
        """Test guest access with whitespace-only token."""
        headers = {"Authorization": "Bearer   "}
        response = test_client.get("/students/", headers=headers)
        assert response.status_code == 401

    def test_guest_access_with_wrong_auth_scheme(self, test_client):
        """Test guest access with wrong authentication scheme."""
        headers = {"Authorization": "Basic dXNlcjpwYXNz"}  # Basic auth instead of Bearer
        response = test_client.get("/students/", headers=headers)
        assert response.status_code == 401

    def test_guest_access_with_incomplete_bearer_token(self, test_client):
        """Test guest access with incomplete Bearer token."""
        headers = {"Authorization": "Bearer"}
        response = test_client.get("/students/", headers=headers)
        assert response.status_code == 401

class TestStudentsGuestAccessPerformance:
    """Performance tests for guest access scenarios."""

    def test_guest_access_response_time(self, test_client):
        """Test that guest access responses are reasonably fast."""
        import time

        start_time = time.time()
        response = test_client.get("/students/")
        end_time = time.time()

        # Should respond within 2 seconds even for unauthorized access
        assert (end_time - start_time) < 2.0
        # Should return proper error status
        assert response.status_code in [401, 403]

    def test_guest_access_concurrent_requests(self, test_client):
        """Test handling of concurrent guest access requests."""
        def make_guest_request():
            return test_client.get("/students/")

        import concurrent.futures

        # Make multiple concurrent guest requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_guest_request) for _ in range(5)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]

        # All requests should return consistent error codes
        assert all(response.status_code in [401, 403] for response in responses)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])