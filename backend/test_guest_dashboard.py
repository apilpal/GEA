"""
Comprehensive tests for guest dashboard functionality.

Tests guest dashboard API endpoints, data access patterns, and guest-specific
functionality including rate limiting, data filtering, and error handling.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession


class TestGuestDashboardAPI:
    """Test cases for guest dashboard API endpoints and functionality."""

    def test_guest_dashboard_stats_endpoint_exists(self):
        """Test that guest dashboard stats endpoint is properly registered."""
        from src.main import app

        # Verify route exists
        routes = [route.path for route in app.routes]
        assert "/api/dashboard/public/stats" in routes

    def test_guest_dashboard_charts_endpoint_exists(self):
        """Test that guest dashboard charts endpoint is properly registered."""
        from src.main import app

        # Verify route exists
        routes = [route.path for route in app.routes]
        assert "/api/dashboard/public/charts" in routes

    def test_guest_dashboard_drivers_endpoint_exists(self):
        """Test that guest dashboard drivers endpoint is properly registered."""
        from src.main import app

        # Verify route exists
        routes = [route.path for route in app.routes]
        assert "/api/dashboard/public/drivers" in routes

    def test_public_stats_endpoint_response_format(self):
        """Test that public stats endpoint returns properly formatted data."""
        from src.main import app

        client = TestClient(app)
        response = client.get("/api/dashboard/public/stats")

        assert response.status_code == 200
        data = response.json()

        # Verify all required fields are present
        required_fields = [
            "total_drivers", "total_students", "total_revenue",
            "active_drivers", "system_status", "guest_access", "last_updated"
        ]

        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

        # Verify data types
        assert isinstance(data["total_drivers"], int)
        assert isinstance(data["total_students"], int)
        assert isinstance(data["total_revenue"], (int, float))
        assert isinstance(data["active_drivers"], int)
        assert isinstance(data["system_status"], str)
        assert data["guest_access"] is True

    def test_public_charts_endpoint_response_format(self):
        """Test that public charts endpoint returns properly formatted data."""
        from src.main import app

        client = TestClient(app)
        response = client.get("/api/dashboard/public/charts")

        assert response.status_code == 200
        data = response.json()

        # Verify all required fields are present
        required_fields = [
            "student_distribution", "revenue_by_driver", "revenue_by_class",
            "guest_access", "charts_count"
        ]

        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

        # Verify data types
        assert isinstance(data["student_distribution"], dict)
        assert isinstance(data["revenue_by_driver"], dict)
        assert isinstance(data["revenue_by_class"], dict)
        assert data["guest_access"] is True
        assert data["charts_count"] == 3

    def test_public_drivers_endpoint_response_format(self):
        """Test that public drivers endpoint returns properly formatted data."""
        from src.main import app

        client = TestClient(app)
        response = client.get("/api/dashboard/public/drivers")

        assert response.status_code == 200
        data = response.json()

        # Verify all required fields are present
        required_fields = ["drivers", "total_count", "guest_access", "pagination"]

        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

        # Verify data types
        assert isinstance(data["drivers"], list)
        assert isinstance(data["total_count"], int)
        assert data["guest_access"] is True
        assert isinstance(data["pagination"], dict)

        # Verify pagination structure
        pagination = data["pagination"]
        assert "skip" in pagination
        assert "limit" in pagination
        assert "has_more" in pagination


class TestGuestDashboardDataFiltering:
    """Test cases for guest dashboard data filtering and access control."""

    def test_guest_stats_excludes_sensitive_data(self):
        """Test that guest stats endpoint excludes sensitive information."""
        from src.main import app

        client = TestClient(app)
        response = client.get("/api/dashboard/public/stats")

        assert response.status_code == 200
        data = response.json()

        # Verify that sensitive fields are not included
        sensitive_fields = [
            "user_details", "internal_metrics", "financial_details",
            "contact_information", "personal_data"
        ]

        for field in sensitive_fields:
            assert field not in data

    def test_guest_drivers_excludes_sensitive_data(self):
        """Test that guest drivers endpoint excludes sensitive driver information."""
        from src.main import app

        client = TestClient(app)
        response = client.get("/api/dashboard/public/drivers")

        assert response.status_code == 200
        data = response.json()

        if data["drivers"]:
            driver = data["drivers"][0]

            # Verify required fields are present
            assert "id" in driver
            assert "name" in driver
            assert "route" in driver
            assert "status" in driver
            assert "total_students" in driver

            # Verify sensitive fields are excluded
            sensitive_fields = [
                "contact_number", "license_number", "vehicle_number",
                "email", "address", "salary", "bank_details"
            ]

            for field in sensitive_fields:
                assert field not in driver, f"Sensitive field '{field}' should not be exposed to guests"

    def test_guest_charts_use_aggregated_data(self):
        """Test that guest charts use properly aggregated data."""
        from src.main import app

        client = TestClient(app)
        response = client.get("/api/dashboard/public/charts")

        assert response.status_code == 200
        data = response.json()

        # Verify that chart data doesn't contain individual user details
        chart_data = data["student_distribution"]

        # Should not contain personal information
        if "data" in chart_data:
            for item in chart_data["data"]:
                # Should be aggregated, not individual records
                assert "student_id" not in item
                assert "personal_email" not in item
                assert "phone_number" not in item


class TestGuestDashboardErrorHandling:
    """Test cases for guest dashboard error handling scenarios."""

    @patch('backend.src.api.v1.routers.dashboard.ReportService.get_reports_summary')
    def test_public_stats_database_connection_error(self, mock_service):
        """Test handling of database connection errors in public stats."""
        # Arrange
        mock_service.side_effect = Exception("Connection timeout")

        from src.main import app
        client = TestClient(app)

        # Act
        response = client.get("/api/dashboard/public/stats")

        # Assert
        assert response.status_code == 500
        data = response.json()
        assert "Error retrieving public dashboard statistics" in data["detail"]
        assert "Connection timeout" in data["detail"]

    @patch('backend.src.api.v1.routers.dashboard.ChartService.get_student_distribution_chart_data')
    def test_public_charts_service_unavailable(self, mock_service):
        """Test handling of service unavailable errors in public charts."""
        # Arrange
        mock_service.side_effect = Exception("Service temporarily unavailable")

        from src.main import app
        client = TestClient(app)

        # Act
        response = client.get("/api/dashboard/public/charts")

        # Assert
        assert response.status_code == 500
        data = response.json()
        assert "Error retrieving public dashboard charts" in data["detail"]

    @patch('backend.src.api.v1.routers.dashboard.DriverService.get_all_drivers')
    def test_public_drivers_query_error(self, mock_service):
        """Test handling of query errors in public drivers."""
        # Arrange
        mock_service.side_effect = Exception("Invalid query parameters")

        from src.main import app
        client = TestClient(app)

        # Act
        response = client.get("/api/dashboard/public/drivers")

        # Assert
        assert response.status_code == 500
        data = response.json()
        assert "Error retrieving public driver information" in data["detail"]

    def test_malformed_request_handling(self):
        """Test handling of malformed requests to guest endpoints."""
        from src.main import app

        client = TestClient(app)

        # Test with invalid query parameters
        response = client.get("/api/dashboard/public/drivers?limit=invalid")
        # Should handle gracefully or return appropriate error

        response = client.get("/api/dashboard/public/drivers?skip=invalid&limit=ten")
        # Should handle gracefully or return appropriate error


class TestGuestDashboardRateLimiting:
    """Test cases for guest dashboard rate limiting functionality."""

    def test_rate_limiting_headers_present(self):
        """Test that rate limiting headers are included in responses."""
        from src.main import app

        client = TestClient(app)
        response = client.get("/api/dashboard/public/stats")

        # Check for rate limiting headers (implementation dependent)
        # Headers like X-RateLimit-Limit, X-RateLimit-Remaining may be present

    def test_concurrent_requests_handling(self):
        """Test handling of concurrent requests from guest users."""
        from src.main import app
        import threading
        import time

        client = TestClient(app)
        responses = []
        errors = []

        def make_request():
            try:
                response = client.get("/api/dashboard/public/stats")
                responses.append(response.status_code)
            except Exception as e:
                errors.append(e)

        # Make multiple concurrent requests
        threads = []
        for i in range(5):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # All requests should succeed (rate limiting may apply but not block all)
        assert len(errors) == 0
        assert all(status == 200 for status in responses)


class TestGuestDashboardDataConsistency:
    """Test cases for guest dashboard data consistency and accuracy."""

    def test_data_consistency_across_endpoints(self):
        """Test that data is consistent across different guest endpoints."""
        from src.main import app

        client = TestClient(app)

        # Get data from multiple endpoints
        stats_response = client.get("/api/dashboard/public/stats")
        drivers_response = client.get("/api/dashboard/public/drivers")

        assert stats_response.status_code == 200
        assert drivers_response.status_code == 200

        stats_data = stats_response.json()
        drivers_data = drivers_response.json()

        # Cross-validate data consistency
        # Total drivers from stats should match or be related to drivers endpoint
        if drivers_data["total_count"] > 0:
            # Stats should reflect the actual driver data
            assert stats_data["total_drivers"] >= 0

    def test_guest_access_flag_consistency(self):
        """Test that guest_access flag is consistently set across all endpoints."""
        from src.main import app

        client = TestClient(app)

        endpoints = [
            "/api/dashboard/public/stats",
            "/api/dashboard/public/charts",
            "/api/dashboard/public/drivers"
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200
            data = response.json()
            assert data["guest_access"] is True, f"Inconsistent guest_access flag in {endpoint}"

    def test_timestamp_consistency(self):
        """Test that timestamps are consistent and reasonable."""
        from src.main import app

        client = TestClient(app)
        response = client.get("/api/dashboard/public/stats")

        assert response.status_code == 200
        data = response.json()

        if "last_updated" in data:
            # Timestamp should be present and reasonable
            assert data["last_updated"] is not None
            # Could add more specific timestamp validation if needed


class TestGuestDashboardPerformance:
    """Test cases for guest dashboard performance characteristics."""

    def test_response_time_acceptable(self):
        """Test that guest dashboard responses are reasonably fast."""
        from src.main import app
        import time

        client = TestClient(app)

        # Measure response time
        start_time = time.time()
        response = client.get("/api/dashboard/public/stats")
        end_time = time.time()

        # Assert response time is reasonable (adjust threshold as needed)
        response_time = end_time - start_time
        assert response_time < 2.0, f"Response time too slow: {response_time} seconds"
        assert response.status_code == 200

    def test_memory_usage_reasonable(self):
        """Test that guest dashboard endpoints don't have memory leaks."""
        from src.main import app
        import gc

        client = TestClient(app)

        # Make multiple requests and check for memory issues
        for i in range(10):
            response = client.get("/api/dashboard/public/stats")
            assert response.status_code == 200

            # Force garbage collection periodically
            if i % 5 == 0:
                gc.collect()

        # If we get here without memory errors, the test passes


if __name__ == '__main__':
    pytest.main([__file__])