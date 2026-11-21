"""
Tests for main.py modules to improve test coverage.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


class TestMainModule:
    """Test cases for the main module functionality."""

    def test_main_module_imports(self):
        """Test that main module properly imports and exports the app."""
        # Test backend/main.py
        import backend.main
        assert hasattr(backend.main, 'app')
        assert backend.main.app is not None

        # Test backend/src/main.py
        import backend.src.main
        assert hasattr(backend.src.main, 'app')
        assert hasattr(backend.src.main, 'create_app')
        assert backend.src.main.app is not None

    def test_create_app_functionality(self):
        """Test the create_app function creates a proper FastAPI app."""
        from src.main import create_app

        app = create_app()

        # Verify it's a FastAPI app
        assert hasattr(app, 'routes')
        assert hasattr(app, 'middleware')

        # Check that essential routes are included
        route_paths = [route.path for route in app.routes]
        assert '/api/health' in route_paths

    def test_app_configuration(self):
        """Test that the app is properly configured with middleware and settings."""
        from src.main import app

        # Test that CORS middleware is configured
        assert any(middleware.cls.__name__ == 'CORSMiddleware' for middleware in app.user_middleware)

        # Test that rate limiting middleware is configured
        assert any(middleware.cls.__name__ == 'SlowAPIMiddleware' for middleware in app.user_middleware)

    def test_health_check_endpoint(self):
        """Test the health check endpoint functionality."""
        from src.main import app

        client = TestClient(app)
        response = client.get("/api/health")

        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'ok'

    def test_error_handling(self):
        """Test global error handling in the application."""
        from src.main import app

        # Create a route that raises an exception to test error handling
        @app.get("/test-error")
        async def test_error():
            raise Exception("Test error")

        client = TestClient(app)
        response = client.get("/test-error")

        # Should return 500 with proper error format
        assert response.status_code == 500
        data = response.json()
        assert 'detail' in data
        assert data['detail'] == 'Internal server error'

    def test_middleware_configuration(self):
        """Test that middleware is properly configured."""
        from src.main import app

        # Test security headers middleware
        client = TestClient(app)
        response = client.get("/api/health")

        # Check security headers
        assert response.headers.get('X-Content-Type-Options') == 'nosniff'
        assert response.headers.get('X-Frame-Options') == 'DENY'
        assert response.headers.get('X-XSS-Protection') == '1; mode=block'

    def test_lifespan_events(self):
        """Test application lifespan event handling."""
        from src.main import app

        # The lifespan should be configured
        assert hasattr(app, 'router')
        assert app.router.lifespan_context is not None

    def test_rate_limiting_configuration(self):
        """Test that rate limiting is properly configured."""
        from src.main import app

        # Check that rate limiter is attached to app state
        assert hasattr(app.state, 'limiter')
        assert app.state.limiter is not None

    def test_static_files_mounting(self):
        """Test that static files are properly mounted."""
        from src.main import app

        # Check that static files are mounted
        mounted_routes = [route for route in app.routes if hasattr(route, 'app')]
        assert len(mounted_routes) > 0

    @patch('backend.src.main.config')
    def test_production_middleware_configuration(self, mock_config):
        """Test middleware configuration in production mode."""
        # Mock production configuration
        mock_config.is_production = True
        mock_config.SSL_CERT_PATH = '/path/to/cert'
        mock_config.SSL_KEY_PATH = '/path/to/key'
        mock_config.CORS_ORIGINS = ['https://example.com']

        from src.main import create_app

        app = create_app()

        # In production, should have trusted host middleware
        assert any(middleware.cls.__name__ == 'TrustedHostMiddleware' for middleware in app.user_middleware)


class TestGuestDashboardEndpoints:
    """Test cases for guest dashboard public API endpoints."""

    def test_get_public_dashboard_stats_success(self):
        """Test successful retrieval of public dashboard statistics."""
        from src.main import app

        client = TestClient(app)
        response = client.get("/api/v1/dashboard/public/stats")

        assert response.status_code == 200
        data = response.json()

        # Verify required fields are present
        assert "total_drivers" in data
        assert "total_students" in data
        assert "total_revenue" in data
        assert "active_drivers" in data
        assert "system_status" in data
        assert "guest_access" in data
        assert data["guest_access"] is True
        assert data["system_status"] == "operational"

        # Verify data types
        assert isinstance(data["total_drivers"], int)
        assert isinstance(data["total_students"], int)
        assert isinstance(data["total_revenue"], (int, float))

    def test_get_public_dashboard_stats_database_error(self):
        """Test handling of database errors in public dashboard stats."""
        from src.main import app
        from unittest.mock import patch

        # Mock database service to raise an exception
        with patch('backend.src.api.v1.routers.dashboard.ReportService.get_reports_summary') as mock_service:
            mock_service.side_effect = Exception("Database connection failed")

            client = TestClient(app)
            response = client.get("/api/v1/dashboard/public/stats")

            assert response.status_code == 500
            data = response.json()
            assert "Error retrieving public dashboard statistics" in data["detail"]

    def test_get_public_dashboard_charts_success(self):
        """Test successful retrieval of public dashboard charts."""
        from src.main import app

        client = TestClient(app)
        response = client.get("/api/v1/dashboard/public/charts")

        assert response.status_code == 200
        data = response.json()

        # Verify required fields are present
        assert "student_distribution" in data
        assert "revenue_by_driver" in data
        assert "revenue_by_class" in data
        assert "guest_access" in data
        assert "charts_count" in data
        assert data["guest_access"] is True
        assert data["charts_count"] == 3

    def test_get_public_dashboard_charts_database_error(self):
        """Test handling of database errors in public dashboard charts."""
        from src.main import app
        from unittest.mock import patch

        # Mock chart service to raise an exception
        with patch('backend.src.api.v1.routers.dashboard.ChartService.get_student_distribution_chart_data') as mock_service:
            mock_service.side_effect = Exception("Chart data unavailable")

            client = TestClient(app)
            response = client.get("/api/v1/dashboard/public/charts")

            assert response.status_code == 500
            data = response.json()
            assert "Error retrieving public dashboard charts" in data["detail"]

    def test_get_public_driver_info_success(self):
        """Test successful retrieval of public driver information."""
        from src.main import app

        client = TestClient(app)
        response = client.get("/api/v1/dashboard/public/drivers")

        assert response.status_code == 200
        data = response.json()

        # Verify required fields are present
        assert "drivers" in data
        assert "total_count" in data
        assert "guest_access" in data
        assert "pagination" in data
        assert data["guest_access"] is True
        assert isinstance(data["drivers"], list)
        assert isinstance(data["total_count"], int)

        # Verify pagination structure
        pagination = data["pagination"]
        assert "skip" in pagination
        assert "limit" in pagination
        assert "has_more" in pagination

        # Verify driver data structure (if drivers exist)
        if data["drivers"]:
            driver = data["drivers"][0]
            assert "id" in driver
            assert "name" in driver
            assert "route" in driver
            assert "status" in driver
            assert "total_students" in driver

            # Verify sensitive fields are not included
            assert "contact_number" not in driver
            assert "license_number" not in driver
            assert "vehicle_number" not in driver

    def test_get_public_driver_info_with_pagination(self):
        """Test public driver info with pagination parameters."""
        from src.main import app

        client = TestClient(app)
        response = client.get("/api/v1/dashboard/public/drivers?skip=10&limit=5")

        assert response.status_code == 200
        data = response.json()

        # Verify pagination parameters are reflected in response
        assert data["pagination"]["skip"] == 10
        assert data["pagination"]["limit"] == 5

    def test_get_public_driver_info_database_error(self):
        """Test handling of database errors in public driver info."""
        from src.main import app
        from unittest.mock import patch

        # Mock driver service to raise an exception
        with patch('backend.src.api.v1.routers.dashboard.DriverService.get_all_drivers') as mock_service:
            mock_service.side_effect = Exception("Driver data unavailable")

            client = TestClient(app)
            response = client.get("/api/v1/dashboard/public/drivers")

            assert response.status_code == 500
            data = response.json()
            assert "Error retrieving public driver information" in data["detail"]

    def test_public_endpoints_rate_limiting_headers(self):
        """Test that public endpoints include rate limiting information."""
        from src.main import app

        client = TestClient(app)

        # Test stats endpoint
        response = client.get("/api/v1/dashboard/public/stats")
        assert response.status_code == 200

        # Rate limiting headers should be present (implementation dependent)
        # The exact headers depend on the slowapi configuration

    def test_guest_dashboard_data_structure_validation(self):
        """Test that guest dashboard data follows expected structure."""
        from src.main import app

        client = TestClient(app)

        # Test all public endpoints return consistent guest_access flag
        endpoints = [
            "/api/v1/dashboard/public/stats",
            "/api/v1/dashboard/public/charts",
            "/api/v1/dashboard/public/drivers"
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200
            data = response.json()
            assert data["guest_access"] is True

    def test_public_dashboard_stats_data_integrity(self):
        """Test data integrity of public dashboard statistics."""
        from src.main import app

        client = TestClient(app)
        response = client.get("/api/v1/dashboard/public/stats")

        assert response.status_code == 200
        data = response.json()

        # Verify that counts are non-negative
        assert data["total_drivers"] >= 0
        assert data["total_students"] >= 0
        assert data["active_drivers"] >= 0
        assert data["total_revenue"] >= 0

        # Verify system status is valid
        assert data["system_status"] in ["operational", "maintenance", "degraded"]

    def test_public_driver_pagination_bounds(self):
        """Test pagination bounds for public driver information."""
        from src.main import app

        client = TestClient(app)

        # Test with large skip value
        response = client.get("/api/v1/dashboard/public/drivers?skip=1000&limit=50")
        assert response.status_code == 200

        # Test with zero limit (should use default)
        response = client.get("/api/v1/dashboard/public/drivers?limit=0")
        assert response.status_code == 200

        # Test with negative values (should handle gracefully)
        response = client.get("/api/v1/dashboard/public/drivers?skip=-1&limit=-1")
        assert response.status_code == 200


if __name__ == '__main__':
    pytest.main([__file__])
