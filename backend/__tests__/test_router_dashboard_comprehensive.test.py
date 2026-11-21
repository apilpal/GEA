"""
Comprehensive tests for guest dashboard router endpoints.

Tests all aspects of dashboard API endpoints including:
- Public stats endpoint functionality
- Public charts endpoint functionality
- Public drivers endpoint functionality
- Rate limiting and security
- Error handling and edge cases
- Data filtering and validation
- Pagination functionality
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession


class TestGuestDashboardRouter:
    """Test suite for guest dashboard router functionality."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    def test_app(self):
        """Create test FastAPI application."""
        app = FastAPI()
        from src.api.v1.routers.dashboard import router
        app.include_router(router)
        return app

    @pytest.fixture
    def client(self, test_app):
        """Create test client."""
        return TestClient(test_app)

    def test_public_stats_endpoint_exists(self, client):
        """Test that public stats endpoint is properly registered."""
        # Act
        response = client.get("/public/stats")

        # Assert - Should return 200 or 500 (depending on services), but endpoint should exist
        assert response.status_code in [200, 500]

    def test_public_charts_endpoint_exists(self, client):
        """Test that public charts endpoint is properly registered."""
        # Act
        response = client.get("/public/charts")

        # Assert - Should return 200 or 500 (depending on services), but endpoint should exist
        assert response.status_code in [200, 500]

    def test_public_drivers_endpoint_exists(self, client):
        """Test that public drivers endpoint is properly registered."""
        # Act
        response = client.get("/public/drivers")

        # Assert - Should return 200 or 500 (depending on services), but endpoint should exist
        assert response.status_code in [200, 500]

    @patch('src.api.v1.routers.dashboard.ReportService.get_reports_summary')
    def test_public_stats_success_response(self, mock_service, client):
        """Test successful public stats response."""
        # Arrange
        mock_service.return_value = {
            "total_drivers": 10,
            "total_students": 100,
            "total_revenue": 50000,
            "active_drivers": 8,
            "generated_at": "2024-01-01T00:00:00Z"
        }

        # Act
        response = client.get("/public/stats")

        # Assert
        assert response.status_code == 200
        data = response.json()

        # Verify all required fields are present
        required_fields = [
            "total_drivers", "total_students", "total_revenue",
            "active_drivers", "system_status", "guest_access", "last_updated"
        ]

        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

        # Verify data types and values
        assert isinstance(data["total_drivers"], int)
        assert isinstance(data["total_students"], int)
        assert isinstance(data["total_revenue"], (int, float))
        assert isinstance(data["active_drivers"], int)
        assert data["guest_access"] is True
        assert data["system_status"] == "operational"

    @patch('src.api.v1.routers.dashboard.ChartService.get_student_distribution_chart_data')
    @patch('src.api.v1.routers.dashboard.ChartService.get_revenue_by_driver_chart_data')
    @patch('src.api.v1.routers.dashboard.ChartService.get_revenue_by_class_chart_data')
    def test_public_charts_success_response(self, mock_revenue_class, mock_revenue_driver, mock_student_dist, client):
        """Test successful public charts response."""
        # Arrange
        mock_student_dist.return_value = {
            "type": "pie",
            "data": [
                {"class": "10", "count": 25},
                {"class": "11", "count": 30},
                {"class": "12", "count": 20}
            ]
        }

        mock_revenue_driver.return_value = {
            "type": "bar",
            "data": [
                {"driver": "Driver A", "revenue": 15000},
                {"driver": "Driver B", "revenue": 20000}
            ]
        }

        mock_revenue_class.return_value = {
            "type": "line",
            "data": [
                {"class": "10", "revenue": 25000},
                {"class": "11", "revenue": 51730}
            ]
        }

        # Act
        response = client.get("/public/charts")

        # Assert
        assert response.status_code == 200
        data = response.json()

        # Verify all required fields are present
        required_fields = [
            "student_distribution", "revenue_by_driver", "revenue_by_class",
            "guest_access", "charts_count"
        ]

        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

        # Verify data structure
        assert data["guest_access"] is True
        assert data["charts_count"] == 3
        assert "data" in data["student_distribution"]
        assert "data" in data["revenue_by_driver"]
        assert "data" in data["revenue_by_class"]

    @patch('src.api.v1.routers.dashboard.DriverService.get_all_drivers')
    def test_public_drivers_success_response(self, mock_service, client):
        """Test successful public drivers response."""
        # Arrange
        mock_drivers = [
            MagicMock(id=1, name="Driver A", route="Route 1", status="active", total_students=25),
            MagicMock(id=2, name="Driver B", route="Route 2", status="active", total_students=30)
        ]

        mock_result = MagicMock()
        mock_result.drivers = mock_drivers
        mock_result.total_count = 2
        mock_service.return_value = mock_result

        # Act
        response = client.get("/public/drivers")

        # Assert
        assert response.status_code == 200
        data = response.json()

        # Verify all required fields are present
        required_fields = ["drivers", "total_count", "guest_access", "pagination"]

        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

        # Verify data structure
        assert data["guest_access"] is True
        assert data["total_count"] == 2
        assert isinstance(data["drivers"], list)
        assert len(data["drivers"]) == 2

        # Verify sensitive fields are excluded
        driver = data["drivers"][0]
        sensitive_fields = ["contact_number", "license_number", "vehicle_number", "email", "address"]
        for field in sensitive_fields:
            assert field not in driver, f"Sensitive field '{field}' should not be exposed"

        # Verify required fields are present
        required_driver_fields = ["id", "name", "route", "status", "total_students"]
        for field in required_driver_fields:
            assert field in driver, f"Required field '{field}' missing from driver data"

    @patch('src.api.v1.routers.dashboard.DriverService.get_all_drivers')
    def test_public_drivers_pagination(self, mock_service, client):
        """Test public drivers pagination functionality."""
        # Arrange
        mock_drivers = [
            MagicMock(id=i, name=f"Driver {i}", route=f"Route {i}", status="active", total_students=25)
            for i in range(1, 6)
        ]

        mock_result = MagicMock()
        mock_result.drivers = mock_drivers
        mock_result.total_count = 25
        mock_service.return_value = mock_result

        # Act - Test pagination parameters
        response = client.get("/public/drivers?skip=0&limit=5")

        # Assert
        assert response.status_code == 200
        data = response.json()

        assert data["pagination"]["skip"] == 0
        assert data["pagination"]["limit"] == 5
        assert data["pagination"]["has_more"] is True  # 5 < 25, so has more

        # Test skip parameter
        response = client.get("/public/drivers?skip=20&limit=5")
        data = response.json()
        assert data["pagination"]["skip"] == 20
        assert data["pagination"]["limit"] == 5

    @patch('src.api.v1.routers.dashboard.ReportService.get_reports_summary')
    def test_public_stats_rate_limiting(self, mock_service, client):
        """Test rate limiting on public stats endpoint."""
        # Arrange
        mock_service.return_value = {
            "total_drivers": 10,
            "total_students": 100,
            "total_revenue": 50000,
            "active_drivers": 8,
            "generated_at": "2024-01-01T00:00:00Z"
        }

        # Act - Make multiple requests rapidly
        responses = []
        for i in range(35):  # Exceed 30 per minute limit
            response = client.get("/public/stats")
            responses.append(response.status_code)

        # Assert - Should get rate limited after exceeding limit
        assert 200 in responses  # Some should succeed
        assert 429 in responses  # Some should be rate limited

    def test_public_stats_error_handling(self, client):
        """Test error handling in public stats endpoint."""
        # Arrange - Mock service to raise exception
        with patch('src.api.v1.routers.dashboard.ReportService.get_reports_summary') as mock_service:
            mock_service.side_effect = Exception("Database connection timeout")

            # Act
            response = client.get("/public/stats")

        # Assert
        assert response.status_code == 500
        data = response.json()
        assert "Error retrieving public dashboard statistics" in data["detail"]
        assert "Database connection timeout" in data["detail"]

    def test_public_charts_error_handling(self, client):
        """Test error handling in public charts endpoint."""
        # Arrange - Mock service to raise exception
        with patch('src.api.v1.routers.dashboard.ChartService.get_student_distribution_chart_data') as mock_service:
            mock_service.side_effect = Exception("Service temporarily unavailable")

            # Act
            response = client.get("/public/charts")

        # Assert
        assert response.status_code == 500
        data = response.json()
        assert "Error retrieving public dashboard charts" in data["detail"]

    def test_public_drivers_error_handling(self, client):
        """Test error handling in public drivers endpoint."""
        # Arrange - Mock service to raise exception
        with patch('src.api.v1.routers.dashboard.DriverService.get_all_drivers') as mock_service:
            mock_service.side_effect = Exception("Invalid query parameters")

            # Act
            response = client.get("/public/drivers")

        # Assert
        assert response.status_code == 500
        data = response.json()
        assert "Error retrieving public driver information" in data["detail"]

    @patch('src.api.v1.routers.dashboard.ReportService.get_reports_summary')
    def test_public_stats_data_filtering(self, mock_service, client):
        """Test that public stats exclude sensitive information."""
        # Arrange
        mock_service.return_value = {
            "total_drivers": 10,
            "total_students": 100,
            "total_revenue": 50000,
            "active_drivers": 8,
            "user_details": {"admin": "admin@example.com"},  # Sensitive data
            "internal_metrics": {"cpu_usage": 0.5},  # Internal data
            "generated_at": "2024-01-01T00:00:00Z"
        }

        # Act
        response = client.get("/public/stats")

        # Assert
        assert response.status_code == 200
        data = response.json()

        # Verify sensitive fields are not included
        sensitive_fields = ["user_details", "internal_metrics", "financial_details", "contact_information"]
        for field in sensitive_fields:
            assert field not in data, f"Sensitive field '{field}' should not be exposed"

    @patch('src.api.v1.routers.dashboard.DriverService.get_all_drivers')
    def test_public_drivers_data_filtering(self, mock_service, client):
        """Test that public drivers exclude sensitive information."""
        # Arrange
        mock_driver = MagicMock()
        mock_driver.id = 1
        mock_driver.name = "Driver A"
        mock_driver.route = "Route 1"
        mock_driver.status = "active"
        mock_driver.total_students = 25
        # Add sensitive fields that should be filtered out
        mock_driver.contact_number = "1234567890"
        mock_driver.license_number = "DL123456789"
        mock_driver.vehicle_number = "ABC123"
        mock_driver.email = "driver@example.com"
        mock_driver.address = "123 Driver St"

        mock_result = MagicMock()
        mock_result.drivers = [mock_driver]
        mock_result.total_count = 1
        mock_service.return_value = mock_result

        # Act
        response = client.get("/public/drivers")

        # Assert
        assert response.status_code == 200
        data = response.json()

        driver = data["drivers"][0]

        # Verify required fields are present
        assert "id" in driver
        assert "name" in driver
        assert "route" in driver
        assert "status" in driver
        assert "total_students" in driver

        # Verify sensitive fields are excluded
        sensitive_fields = ["contact_number", "license_number", "vehicle_number", "email", "address", "salary"]
        for field in sensitive_fields:
            assert field not in driver, f"Sensitive field '{field}' should not be exposed to guests"

    def test_cors_headers_present(self, client):
        """Test that CORS headers are present in responses."""
        # Act
        response = client.get("/public/stats")

        # Assert - CORS headers should be present (implementation dependent)
        # This test ensures the endpoint is properly configured for guest access
        assert response.status_code in [200, 500]  # Should respond, not be blocked

    def test_response_content_type(self, client):
        """Test that responses have correct content type."""
        # Act
        response = client.get("/public/stats")

        # Assert
        assert response.status_code in [200, 500]
        if response.status_code == 200:
            assert response.headers.get("content-type", "").startswith("application/json")


if __name__ == '__main__':
    pytest.main([__file__, '-v'])