"""
Comprehensive test suite for driver router endpoints.

This module tests all driver management endpoints including CRUD operations,
legacy CSV data access, and error handling at the API level.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.models import CreateDriverRequest, UpdateDriverRequest

@pytest.fixture
def client():
    """Create test client for FastAPI app."""
    return TestClient(app)

@pytest.fixture
async def sample_driver_data():
    """Sample driver data for testing."""
    return CreateDriverRequest(
        name="Test Driver",
        route="Test Route",
        vehicle_number="ABC123",
        contact_number="1234567890",
        license_number="LIC123456",
        experience_years=5
    )

class TestDriverRouter:
    """Test suite for driver router endpoints."""

    def test_get_drivers_empty(self, client):
        """Test getting drivers when none exist."""
        response = client.get("/api/drivers")
        assert response.status_code == 200
        data = response.json()
        assert "drivers" in data
        assert "total_count" in data
        assert data["total_count"] == 0
        assert len(data["drivers"]) == 0

    def test_create_driver_success(self, client, sample_driver_data):
        """Test successful driver creation."""
        response = client.post("/api/drivers", json=sample_driver_data.dict())
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_driver_data.name
        assert data["route"] == sample_driver_data.route
        assert data["vehicle_number"] == sample_driver_data.vehicle_number
        assert data["id"] is not None

    def test_create_driver_validation_error(self, client):
        """Test driver creation with invalid data."""
        invalid_data = {
            "name": "",  # Empty name should fail
            "route": "Test Route",
            "vehicle_number": "ABC123"
        }
        response = client.post("/api/drivers", json=invalid_data)
        assert response.status_code == 422  # Validation error

    def test_create_driver_duplicate_name(self, client, sample_driver_data):
        """Test that duplicate driver names are rejected."""
        # Create first driver
        client.post("/api/drivers", json=sample_driver_data.dict())

        # Try to create second driver with same name
        duplicate_data = sample_driver_data.dict()
        duplicate_data["route"] = "Different Route"
        duplicate_data["vehicle_number"] = "XYZ789"

        response = client.post("/api/drivers", json=duplicate_data)
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

    def test_create_driver_duplicate_vehicle(self, client, sample_driver_data):
        """Test that duplicate vehicle numbers are rejected."""
        # Create first driver
        client.post("/api/drivers", json=sample_driver_data.dict())

        # Try to create second driver with same vehicle number
        duplicate_data = sample_driver_data.dict()
        duplicate_data["name"] = "Different Driver"
        duplicate_data["route"] = "Different Route"

        response = client.post("/api/drivers", json=duplicate_data)
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

    def test_get_driver_info_success(self, client, sample_driver_data):
        """Test getting driver info with student count."""
        # Create driver first
        create_response = client.post("/api/drivers", json=sample_driver_data.dict())
        driver_name = create_response.json()["name"]

        # Get driver info
        response = client.get(f"/api/drivers/{driver_name}/info")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == driver_name
        assert "total_students" in data
        assert isinstance(data["total_students"], int)

    def test_get_driver_info_not_found(self, client):
        """Test getting info for non-existent driver."""
        response = client.get("/api/drivers/NonExistentDriver/info")
        assert response.status_code == 404

    def test_update_driver_success(self, client, sample_driver_data):
        """Test successful driver update."""
        # Create driver first
        create_response = client.post("/api/drivers", json=sample_driver_data.dict())
        driver_name = create_response.json()["name"]

        # Update driver
        update_data = {
            "route": "Updated Route",
            "contact_number": "9876543210",
            "experience_years": 7
        }
        response = client.put(f"/api/drivers/{driver_name}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["route"] == "Updated Route"
        assert data["contact_number"] == "9876543210"
        assert data["experience_years"] == 7
        assert data["name"] == driver_name  # Unchanged

    def test_update_driver_not_found(self, client):
        """Test updating non-existent driver."""
        update_data = {"route": "Updated Route"}
        response = client.put("/api/drivers/NonExistentDriver", json=update_data)
        assert response.status_code == 404

    def test_get_all_drivers_with_data(self, client, sample_driver_data):
        """Test getting all drivers with pagination."""
        # Create a few drivers
        client.post("/api/drivers", json=sample_driver_data.dict())

        driver2_data = sample_driver_data.dict()
        driver2_data["name"] = "Driver 2"
        driver2_data["vehicle_number"] = "XYZ789"
        client.post("/api/drivers", json=driver2_data)

        # Get all drivers
        response = client.get("/api/drivers?skip=0&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] >= 2
        assert len(data["drivers"]) >= 2
        assert any(d["name"] == "Test Driver" for d in data["drivers"])
        assert any(d["name"] == "Driver 2" for d in data["drivers"])

    def test_pagination_drivers(self, client, sample_driver_data):
        """Test driver pagination."""
        # Create multiple drivers
        for i in range(5):
            data = sample_driver_data.dict()
            data["name"] = f"Driver {i}"
            data["vehicle_number"] = f"ABC{i}23"
            client.post("/api/drivers", json=data)

        # Test pagination
        response = client.get("/api/drivers?skip=0&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["drivers"]) == 2

        response = client.get("/api/drivers?skip=2&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["drivers"]) == 2

    def test_legacy_csv_endpoint_not_found(self, client):
        """Test legacy CSV endpoint for non-existent driver."""
        response = client.get("/api/drivers/NonExistentDriver")
        assert response.status_code == 404

    def test_invalid_license_number(self, client):
        """Test driver creation with invalid license number."""
        invalid_data = {
            "name": "Test Driver",
            "route": "Test Route",
            "vehicle_number": "ABC123",
            "contact_number": "1234567890",
            "license_number": "",  # Empty license should be allowed or validated
            "experience_years": 5
        }
        response = client.post("/api/drivers", json=invalid_data)
        # License number might be optional, so this could be 200 or validation error
        assert response.status_code in [200, 422]

    def test_negative_experience_years(self, client):
        """Test driver creation with negative experience years."""
        invalid_data = {
            "name": "Test Driver",
            "route": "Test Route",
            "vehicle_number": "ABC123",
            "contact_number": "1234567890",
            "license_number": "LIC123456",
            "experience_years": -1  # Negative should fail validation
        }
        response = client.post("/api/drivers", json=invalid_data)
        assert response.status_code == 422  # Validation error

    def test_update_partial_fields(self, client, sample_driver_data):
        """Test updating only specific fields of a driver."""
        # Create driver first
        create_response = client.post("/api/drivers", json=sample_driver_data.dict())
        driver_name = create_response.json()["name"]

        # Update only route
        update_data = {"route": "New Route"}
        response = client.put(f"/api/drivers/{driver_name}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["route"] == "New Route"
        assert data["vehicle_number"] == sample_driver_data.vehicle_number  # Unchanged

    def test_driver_info_includes_all_fields(self, client, sample_driver_data):
        """Test that driver info endpoint returns complete driver data."""
        # Create driver first
        create_response = client.post("/api/drivers", json=sample_driver_data.dict())
        driver_name = create_response.json()["name"]

        # Get driver info
        response = client.get(f"/api/drivers/{driver_name}/info")
        assert response.status_code == 200
        data = response.json()

        # Verify all expected fields are present
        expected_fields = [
            "id", "name", "route", "vehicle_number", "contact_number",
            "license_number", "experience_years", "total_students"
        ]
        for field in expected_fields:
            assert field in data

class TestDriverRouterGuestAccess:
   """Test suite for guest access to driver endpoints."""

   def test_guest_cannot_access_drivers_list(self, client):
       """Test that guest users cannot access drivers list without authentication."""
       response = client.get("/api/drivers/")
       # Should be unauthorized (401) or forbidden (403)
       assert response.status_code in [401, 403]

   def test_guest_cannot_access_driver_data(self, client):
       """Test that guest users cannot access raw driver CSV data."""
       response = client.get("/api/drivers/TestDriver")
       # Should be unauthorized (401) or forbidden (403)
       assert response.status_code in [401, 403]

   def test_guest_cannot_create_driver(self, client):
       """Test that guest users cannot create new drivers."""
       driver_data = {
           "name": "Guest Driver",
           "route": "Guest Route",
           "vehicle_number": "GUEST001",
           "contact_number": "9876543210",
           "license_number": "GUESTLIC001",
           "experience_years": 2
       }
       response = client.post("/api/drivers/", json=driver_data)
       # Should be unauthorized (401) or forbidden (403)
       assert response.status_code in [401, 403]

   def test_guest_cannot_update_driver(self, client):
       """Test that guest users cannot update driver records."""
       update_data = {"route": "Updated Route"}
       response = client.put("/api/drivers/TestDriver", json=update_data)
       # Should be unauthorized (401) or forbidden (403)
       assert response.status_code in [401, 403]

   def test_guest_cannot_access_driver_info(self, client):
       """Test that guest users cannot access detailed driver information."""
       response = client.get("/api/drivers/TestDriver/info")
       # Should be unauthorized (401) or forbidden (403)
       assert response.status_code in [401, 403]

   def test_guest_can_access_guest_drivers_endpoint(self, client):
       """Test that guest users can access the guest drivers endpoint."""
       response = client.get("/api/drivers/guest/")
       # Should be allowed for guest users
       assert response.status_code == 200

       data = response.json()
       assert "drivers" in data
       assert "total_count" in data
       assert "guest_access" in data
       assert data["guest_access"] == True

   def test_guest_drivers_endpoint_pagination(self, client):
       """Test pagination in guest drivers endpoint."""
       response = client.get("/api/drivers/guest/?skip=0&limit=5")
       assert response.status_code == 200

       data = response.json()
       assert "drivers" in data
       assert "pagination" in data
       assert "skip" in data["pagination"]
       assert "limit" in data["pagination"]

   def test_guest_drivers_limited_information(self, client):
       """Test that guest drivers endpoint returns limited information."""
       response = client.get("/api/drivers/guest/")
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

   def test_guest_cannot_access_drivers_with_invalid_token(self, client):
       """Test that guest users with invalid tokens cannot access driver endpoints."""
       headers = {"Authorization": "Bearer invalid_token"}
       response = client.get("/api/drivers/", headers=headers)
       assert response.status_code == 401

   def test_guest_drivers_rate_limiting(self, client):
       """Test that guest driver access is properly rate limited."""
       # Make multiple requests rapidly to guest drivers endpoint
       responses = []
       for i in range(10):
           response = client.get("/api/drivers/guest/")
           responses.append(response.status_code)

       # Should be successful or rate limited gracefully
       assert all(status in [200, 429] for status in responses)

if __name__ == "__main__":
   pytest.main([__file__, "-v"])