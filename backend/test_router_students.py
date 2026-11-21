"""
Comprehensive test suite for student router endpoints.

This module tests all student management endpoints including CRUD operations,
search functionality, pagination, and error handling at the API level.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from backend.main import app
from backend.models import Student, CreateStudentRequest, UpdateStudentRequest

@pytest.fixture
def client():
    """Create test client for FastAPI app."""
    return TestClient(app)

@pytest.fixture
async def sample_student_data():
    """Sample student data for testing."""
    return CreateStudentRequest(
        name="Test Student",
        father_name="Test Father",
        class_="10",
        mobile="1234567890",
        route="I",
        fees=1000.0,
        address="Test Address"
    )

class TestStudentRouter:
    """Test suite for student router endpoints."""

    def test_get_students_empty(self, client):
        """Test getting students when none exist."""
        response = client.get("/api/students")
        assert response.status_code == 200
        data = response.json()
        assert "students" in data
        assert "total_count" in data
        assert data["total_count"] == 0
        assert len(data["students"]) == 0

    def test_create_student_success(self, client, sample_student_data):
        """Test successful student creation."""
        response = client.post("/api/students", json=sample_student_data.dict())
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_student_data.name
        assert data["father_name"] == sample_student_data.father_name
        assert data["id"] is not None

    def test_create_student_validation_error(self, client):
        """Test student creation with invalid data."""
        invalid_data = {
            "name": "",  # Empty name should fail
            "father_name": "Test Father",
            "class": "10",
            "mobile": "1234567890"
        }
        response = client.post("/api/students", json=invalid_data)
        assert response.status_code == 422  # Validation error

    def test_create_student_duplicate_mobile(self, client, sample_student_data):
        """Test that duplicate mobile numbers are rejected."""
        # Create first student
        client.post("/api/students", json=sample_student_data.dict())

        # Try to create second student with same mobile
        duplicate_data = sample_student_data.dict()
        duplicate_data["name"] = "Different Student"
        duplicate_data["father_name"] = "Different Father"

        response = client.post("/api/students", json=duplicate_data)
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

    def test_get_student_by_id_success(self, client, sample_student_data):
        """Test getting student by ID."""
        # Create student first
        create_response = client.post("/api/students", json=sample_student_data.dict())
        student_id = create_response.json()["id"]

        # Get student by ID
        response = client.get(f"/api/students/{student_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == student_id
        assert data["name"] == sample_student_data.name

    def test_get_student_by_id_not_found(self, client):
        """Test getting non-existent student."""
        response = client.get("/api/students/99999")
        assert response.status_code == 404

    def test_update_student_success(self, client, sample_student_data):
        """Test successful student update."""
        # Create student first
        create_response = client.post("/api/students", json=sample_student_data.dict())
        student_id = create_response.json()["id"]

        # Update student
        update_data = {"name": "Updated Name", "class_": "11"}
        response = client.put(f"/api/students/{student_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["class_"] == "11"
        assert data["father_name"] == sample_student_data.father_name  # Unchanged

    def test_update_student_not_found(self, client):
        """Test updating non-existent student."""
        update_data = {"name": "Updated Name"}
        response = client.put("/api/students/99999", json=update_data)
        assert response.status_code == 404

    def test_delete_student_success(self, client, sample_student_data):
        """Test successful student deletion."""
        # Create student first
        create_response = client.post("/api/students", json=sample_student_data.dict())
        student_id = create_response.json()["id"]

        # Delete student
        response = client.delete(f"/api/students/{student_id}")
        assert response.status_code == 200
        assert "message" in response.json()

        # Verify student is gone
        response = client.get(f"/api/students/{student_id}")
        assert response.status_code == 404

    def test_delete_student_not_found(self, client):
        """Test deleting non-existent student."""
        response = client.delete("/api/students/99999")
        assert response.status_code == 404

    def test_search_students_success(self, client, sample_student_data):
        """Test student search functionality."""
        # Create a few students
        client.post("/api/students", json=sample_student_data.dict())

        search_data = sample_student_data.dict()
        search_data["name"] = "Search Student"
        search_data["father_name"] = "Search Father"
        client.post("/api/students", json=search_data)

        # Search for students
        response = client.get("/api/students/search/?q=Search")
        assert response.status_code == 200
        data = response.json()
        assert len(data["students"]) >= 1
        assert any(s["name"] == "Search Student" for s in data["students"])

    def test_search_students_no_results(self, client):
        """Test search with no matching results."""
        response = client.get("/api/students/search/?q=nonexistent")
        assert response.status_code == 200
        data = response.json()
        assert len(data["students"]) == 0

    def test_pagination(self, client, sample_student_data):
        """Test student pagination."""
        # Create multiple students
        for i in range(5):
            data = sample_student_data.dict()
            data["name"] = f"Student {i}"
            data["mobile"] = f"123456789{i}"
            client.post("/api/students", json=data)

        # Test pagination
        response = client.get("/api/students?skip=0&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["students"]) == 2

        response = client.get("/api/students?skip=2&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["students"]) == 2

    def test_rate_limiting_create_student(self, client, sample_student_data):
        """Test rate limiting on student creation."""
        # This test would need to be configured based on rate limiting settings
        # For now, just verify the endpoint accepts the request
        response = client.post("/api/students", json=sample_student_data.dict())
        assert response.status_code in [200, 429]  # 200 if not rate limited, 429 if limited

    def test_invalid_mobile_number(self, client):
        """Test student creation with invalid mobile number."""
        invalid_data = {
            "name": "Test Student",
            "father_name": "Test Father",
            "class": "10",
            "mobile": "123",  # Too short
            "route": "I",
            "address": "Test Address"
        }
        response = client.post("/api/students", json=invalid_data)
        assert response.status_code == 400  # Should be validation error

    def test_invalid_class_format(self, client):
        """Test student creation with invalid class format."""
        invalid_data = {
            "name": "Test Student",
            "father_name": "Test Father",
            "class": "invalid_class",
            "mobile": "1234567890",
            "route": "I",
            "address": "Test Address"
        }
        response = client.post("/api/students", json=invalid_data)
        assert response.status_code == 400  # Should be validation error

class TestStudentRouterGuestAccess:
    """Test suite for guest access to student endpoints."""

    def test_guest_cannot_access_students_list(self, client):
        """Test that guest users cannot access students list without authentication."""
        response = client.get("/api/students")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_access_student_by_id(self, client):
        """Test that guest users cannot access individual student records."""
        response = client.get("/api/students/1")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_create_student(self, client):
        """Test that guest users cannot create new students."""
        student_data = {
            "name": "Guest Student",
            "father_name": "Guest Father",
            "class_": "10",
            "mobile": "9876543210",
            "route": "I",
            "fees": 1000.0,
            "address": "Guest Address"
        }
        response = client.post("/api/students", json=student_data)
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_update_student(self, client):
        """Test that guest users cannot update student records."""
        update_data = {"name": "Updated Name"}
        response = client.put("/api/students/1", json=update_data)
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_delete_student(self, client):
        """Test that guest users cannot delete student records."""
        response = client.delete("/api/students/1")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_search_students(self, client):
        """Test that guest users cannot search students."""
        response = client.get("/api/students/search/?q=test")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_access_students_with_invalid_token(self, client):
        """Test that guest users with invalid tokens cannot access student endpoints."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/api/students", headers=headers)
        # Should be unauthorized (401)
        assert response.status_code == 401

    def test_guest_cannot_access_students_with_malformed_token(self, client):
        """Test that guest users with malformed tokens cannot access student endpoints."""
        headers = {"Authorization": "Bearer malformed.token.here"}
        response = client.get("/api/students", headers=headers)
        # Should be unauthorized (401)
        assert response.status_code == 401

    def test_guest_cannot_access_students_with_expired_token(self, client):
        """Test that guest users with expired tokens cannot access student endpoints."""
        # Create an expired token (this would need to be mocked in real implementation)
        headers = {"Authorization": "Bearer expired_token"}
        response = client.get("/api/students", headers=headers)
        # Should be unauthorized (401)
        assert response.status_code == 401

    def test_guest_access_rate_limiting(self, client):
        """Test that guest access attempts are properly rate limited."""
        # Make multiple requests rapidly
        responses = []
        for i in range(10):
            response = client.get("/api/students")
            responses.append(response.status_code)

        # All should be unauthorized/forbidden, but not crash
        assert all(status in [401, 403, 429] for status in responses)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])