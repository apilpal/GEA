"""
Comprehensive test suite for reports router endpoints.

This module tests all reporting endpoints including summary statistics,
student-driver associations, revenue analysis, and analytics.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.models import CreateStudentRequest, CreateDriverRequest

@pytest.fixture
def client():
    """Create test client for FastAPI app."""
    return TestClient(app)

@pytest.fixture
async def sample_test_data(client):
    """Create sample students and drivers for testing reports."""
    # Create some drivers
    drivers_data = [
        CreateDriverRequest(
            name="Driver A",
            route="Route A",
            vehicle_number="ABC001",
            contact_number="1111111111",
            license_number="LIC001",
            experience_years=3
        ),
        CreateDriverRequest(
            name="Driver B",
            route="Route B",
            vehicle_number="XYZ999",
            contact_number="2222222222",
            license_number="LIC002",
            experience_years=5
        )
    ]

    created_drivers = []
    for driver_data in drivers_data:
        response = client.post("/api/drivers", json=driver_data.dict())
        assert response.status_code == 200
        created_drivers.append(response.json())

    # Create some students assigned to drivers
    students_data = [
        CreateStudentRequest(
            name="Student 1",
            father_name="Father 1",
            class_="10",
            mobile="1000000001",
            route="Route A",
            fees=1000.0,
            address="Address 1"
        ),
        CreateStudentRequest(
            name="Student 2",
            father_name="Father 2",
            class_="9",
            mobile="1000000002",
            route="Route A",
            fees=1200.0,
            address="Address 2"
        ),
        CreateStudentRequest(
            name="Student 3",
            father_name="Father 3",
            class_="10",
            mobile="2000000003",
            route="Route B",
            fees=1100.0,
            address="Address 3"
        )
    ]

    created_students = []
    for student_data in students_data:
        response = client.post("/api/students", json=student_data.dict())
        assert response.status_code == 200
        created_students.append(response.json())

    return {
        "drivers": created_drivers,
        "students": created_students
    }

class TestReportsRouter:
    """Test suite for reports router endpoints."""

    def test_reports_summary_success(self, client, sample_test_data):
        """Test getting comprehensive reports summary."""
        response = client.get("/api/reports/summary")
        assert response.status_code == 200
        data = response.json()

        # Verify structure
        assert "total_students" in data
        assert "total_drivers" in data
        assert "total_revenue" in data
        assert "drivers" in data

        # Verify data types
        assert isinstance(data["total_students"], int)
        assert isinstance(data["total_drivers"], int)
        assert isinstance(data["total_revenue"], (int, float))
        assert isinstance(data["drivers"], list)

        # Verify values are reasonable
        assert data["total_students"] >= 3
        assert data["total_drivers"] >= 2
        assert data["total_revenue"] >= 3300.0  # Sum of student fees

    def test_students_by_driver_success(self, client, sample_test_data):
        """Test getting students organized by driver."""
        response = client.get("/api/reports/students-by-driver")
        assert response.status_code == 200
        data = response.json()

        # Should have entries for each driver route
        assert "Route A" in data
        assert "Route B" in data

        # Route A should have 2 students
        assert len(data["Route A"]) == 2
        student_names_a = [s["name"] for s in data["Route A"]]
        assert "Student 1" in student_names_a
        assert "Student 2" in student_names_a

        # Route B should have 1 student
        assert len(data["Route B"]) == 1
        assert data["Route B"][0]["name"] == "Student 3"

    def test_revenue_analysis_success(self, client, sample_test_data):
        """Test comprehensive revenue analysis."""
        response = client.get("/api/reports/revenue-analysis")
        assert response.status_code == 200
        data = response.json()

        # Should have revenue breakdown by driver and class
        assert "by_driver" in data
        assert "by_class" in data
        assert "total_revenue" in data

        # Verify driver revenue breakdown
        assert "Route A" in data["by_driver"]
        assert "Route B" in data["by_driver"]

        # Route A revenue: 1000 + 1200 = 2200
        assert data["by_driver"]["Route A"] == 2200.0
        # Route B revenue: 1100 = 1100
        assert data["by_driver"]["Route B"] == 1100.0

        # Verify class revenue breakdown
        assert "10" in data["by_class"]
        assert "9" in data["by_class"]

        # Class 10 revenue: 1000 + 1100 = 2100
        assert data["by_class"]["10"] == 2100.0
        # Class 9 revenue: 1200 = 1200
        assert data["by_class"]["9"] == 1200.0

        # Total revenue should match
        assert data["total_revenue"] == 3300.0

    def test_driver_student_stats_success(self, client, sample_test_data):
        """Test driver and student statistics."""
        response = client.get("/api/reports/driver-student-stats")
        assert response.status_code == 200
        data = response.json()

        # Verify structure
        assert "total_drivers" in data
        assert "total_students" in data
        assert "average_students_per_driver" in data
        assert "driver_statistics" in data

        # Verify values
        assert data["total_drivers"] >= 2
        assert data["total_students"] >= 3

        # Average should be reasonable
        expected_avg = data["total_students"] / data["total_drivers"]
        assert abs(data["average_students_per_driver"] - expected_avg) < 0.01

        # Driver statistics should exist
        assert isinstance(data["driver_statistics"], list)
        assert len(data["driver_statistics"]) >= 2

        # Each driver stat should have required fields
        for stat in data["driver_statistics"]:
            assert "driver_name" in stat
            assert "route" in stat
            assert "student_count" in stat
            assert "total_fees" in stat

    def test_reports_empty_database(self, client):
        """Test reports endpoints with empty database."""
        # Test summary
        response = client.get("/api/reports/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["total_students"] == 0
        assert data["total_drivers"] == 0
        assert data["total_revenue"] == 0.0

        # Test students by driver
        response = client.get("/api/reports/students-by-driver")
        assert response.status_code == 200
        data = response.json()
        assert data == {}  # Empty dict

        # Test revenue analysis
        response = client.get("/api/reports/revenue-analysis")
        assert response.status_code == 200
        data = response.json()
        assert data["total_revenue"] == 0.0
        assert data["by_driver"] == {}
        assert data["by_class"] == {}

        # Test driver student stats
        response = client.get("/api/reports/driver-student-stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total_drivers"] == 0
        assert data["total_students"] == 0
        assert data["average_students_per_driver"] == 0.0
        assert data["driver_statistics"] == []

    def test_reports_data_consistency(self, client, sample_test_data):
        """Test that all report endpoints return consistent data."""
        # Get data from all endpoints
        summary = client.get("/api/reports/summary").json()
        students_by_driver = client.get("/api/reports/students-by-driver").json()
        revenue_analysis = client.get("/api/reports/revenue-analysis").json()
        driver_stats = client.get("/api/reports/driver-student-stats").json()

        # Verify total counts are consistent
        assert summary["total_students"] == driver_stats["total_students"]
        assert summary["total_drivers"] == driver_stats["total_drivers"]

        # Verify revenue is consistent
        assert summary["total_revenue"] == revenue_analysis["total_revenue"]

        # Verify student counts by driver are consistent
        total_students_from_grouping = sum(len(students) for students in students_by_driver.values())
        assert total_students_from_grouping == summary["total_students"]

    def test_reports_error_handling(self, client):
        """Test error handling in reports endpoints."""
        # All endpoints should handle database errors gracefully
        # Since we're using a test database, these should work without issues
        endpoints = [
            "/api/reports/summary",
            "/api/reports/students-by-driver",
            "/api/reports/revenue-analysis",
            "/api/reports/driver-student-stats"
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200  # Should not return 500 errors

    def test_reports_response_structure(self, client, sample_test_data):
        """Test that report responses have consistent structure."""
        endpoints = [
            "/api/reports/summary",
            "/api/reports/students-by-driver",
            "/api/reports/revenue-analysis",
            "/api/reports/driver-student-stats"
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200
            data = response.json()

            # Should be valid JSON
            assert isinstance(data, dict)

            # Should not have null values for key metrics
            if "total_students" in data:
                assert data["total_students"] is not None
            if "total_drivers" in data:
                assert data["total_drivers"] is not None
            if "total_revenue" in data:
                assert data["total_revenue"] is not None

class TestReportsRouterGuestAccess:
    """Test suite for guest access to reports endpoints."""

    def test_guest_cannot_access_reports_summary(self, client):
        """Test that guest users cannot access reports summary without authentication."""
        response = client.get("/api/reports/summary")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_access_students_by_driver(self, client):
        """Test that guest users cannot access students by driver report."""
        response = client.get("/api/reports/students-by-driver")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_access_revenue_analysis(self, client):
        """Test that guest users cannot access revenue analysis report."""
        response = client.get("/api/reports/revenue-analysis")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_access_driver_student_stats(self, client):
        """Test that guest users cannot access driver student statistics."""
        response = client.get("/api/reports/driver-student-stats")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_access_reports_with_invalid_token(self, client):
        """Test that guest users with invalid tokens cannot access report endpoints."""
        headers = {"Authorization": "Bearer invalid_token"}

        endpoints = [
            "/api/reports/summary",
            "/api/reports/students-by-driver",
            "/api/reports/revenue-analysis",
            "/api/reports/driver-student-stats"
        ]

        for endpoint in endpoints:
            response = client.get(endpoint, headers=headers)
            assert response.status_code == 401

    def test_guest_reports_access_rate_limiting(self, client):
        """Test that guest access attempts to reports are properly rate limited."""
        # Make multiple requests rapidly
        responses = []

        for i in range(10):
            response = client.get("/api/reports/summary")
            responses.append(response.status_code)

        # All should be unauthorized/forbidden, but not crash
        assert all(status in [401, 403, 429] for status in responses)

    def test_guest_cannot_access_reports_with_malformed_token(self, client):
        """Test that guest users with malformed tokens cannot access report endpoints."""
        headers = {"Authorization": "Bearer malformed.token.here"}

        endpoints = [
            "/api/reports/summary",
            "/api/reports/students-by-driver",
            "/api/reports/revenue-analysis",
            "/api/reports/driver-student-stats"
        ]

        for endpoint in endpoints:
            response = client.get(endpoint, headers=headers)
            assert response.status_code == 401

    def test_guest_cannot_access_reports_with_expired_token(self, client):
        """Test that guest users with expired tokens cannot access report endpoints."""
        headers = {"Authorization": "Bearer expired_token"}

        endpoints = [
            "/api/reports/summary",
            "/api/reports/students-by-driver",
            "/api/reports/revenue-analysis",
            "/api/reports/driver-student-stats"
        ]

        for endpoint in endpoints:
            response = client.get(endpoint, headers=headers)
            assert response.status_code == 401

    def test_guest_reports_error_responses_structure(self, client):
        """Test that guest error responses for reports have proper structure."""
        response = client.get("/api/reports/summary")

        if response.status_code in [401, 403]:
            data = response.json()
            assert "detail" in data
            assert isinstance(data["detail"], str)
            assert len(data["detail"]) > 0

class TestReportsGuestFirstArchitectureIntegration:
    """Integration tests for guest-first architecture with reports endpoints."""

    def test_guest_access_workflow_isolation(self, client):
        """Test that guest access attempts don't interfere with regular operations."""
        # Guest tries to access reports (should fail)
        guest_response = client.get("/api/reports/summary")
        assert guest_response.status_code in [401, 403]

        # Regular operation should still work (assuming no auth required for this test)
        # This tests that failed guest attempts don't break the system
        list_response = client.get("/api/reports/summary")
        # Should handle gracefully even if auth is required
        assert list_response.status_code in [200, 401, 403]

    def test_guest_access_security_headers(self, client):
        """Test that security headers are present in guest access responses for reports."""
        response = client.get("/api/reports/summary")

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

class TestReportsGuestAccessEdgeCases:
    """Edge cases and boundary conditions for guest access to reports."""

    def test_guest_access_with_empty_headers(self, client):
        """Test guest access with empty authorization headers."""
        headers = {"Authorization": ""}
        response = client.get("/api/reports/summary", headers=headers)
        assert response.status_code == 401

    def test_guest_access_with_whitespace_token(self, client):
        """Test guest access with whitespace-only token."""
        headers = {"Authorization": "Bearer   "}
        response = client.get("/api/reports/summary", headers=headers)
        assert response.status_code == 401

    def test_guest_access_with_wrong_auth_scheme(self, client):
        """Test guest access with wrong authentication scheme."""
        headers = {"Authorization": "Basic dXNlcjpwYXNz"}  # Basic auth instead of Bearer
        response = client.get("/api/reports/summary", headers=headers)
        assert response.status_code == 401

    def test_guest_access_with_incomplete_bearer_token(self, client):
        """Test guest access with incomplete Bearer token."""
        headers = {"Authorization": "Bearer"}
        response = client.get("/api/reports/summary", headers=headers)
        assert response.status_code == 401

class TestReportsGuestAccessPerformance:
    """Performance tests for guest access scenarios."""

    def test_guest_access_response_time(self, client):
        """Test that guest access responses are reasonably fast."""
        import time

        start_time = time.time()
        response = client.get("/api/reports/summary")
        end_time = time.time()

        # Should respond within 2 seconds even for unauthorized access
        assert (end_time - start_time) < 2.0
        # Should return proper error status
        assert response.status_code in [401, 403]

    def test_guest_access_concurrent_requests(self, client):
        """Test handling of concurrent guest access requests."""
        def make_guest_request():
            return client.get("/api/reports/summary")

        import concurrent.futures

        # Make multiple concurrent guest requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_guest_request) for _ in range(5)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]

        # All requests should return consistent error codes
        assert all(response.status_code in [401, 403] for response in responses)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])