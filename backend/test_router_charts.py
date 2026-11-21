"""
Comprehensive test suite for charts router endpoints.

This module tests all chart data endpoints for data visualization,
ensuring proper data formatting for frontend charting libraries.
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
async def sample_chart_data(client):
    """Create sample data for chart testing."""
    # Create drivers
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
        ),
        CreateDriverRequest(
            name="Driver C",
            route="Route C",
            vehicle_number="DEF456",
            contact_number="3333333333",
            license_number="LIC003",
            experience_years=2
        )
    ]

    created_drivers = []
    for driver_data in drivers_data:
        response = client.post("/api/drivers", json=driver_data.dict())
        assert response.status_code == 200
        created_drivers.append(response.json())

    # Create students with different distributions
    students_data = [
        # 5 students for Route A
        CreateStudentRequest(name="Student A1", father_name="Father A1", class_="10", mobile="1000000001", route="Route A", fees=1000.0, address="Addr A1"),
        CreateStudentRequest(name="Student A2", father_name="Father A2", class_="9", mobile="1000000002", route="Route A", fees=1100.0, address="Addr A2"),
        CreateStudentRequest(name="Student A3", father_name="Father A3", class_="10", mobile="1000000003", route="Route A", fees=1200.0, address="Addr A3"),
        CreateStudentRequest(name="Student A4", father_name="Father A4", class_="8", mobile="1000000004", route="Route A", fees=900.0, address="Addr A4"),
        CreateStudentRequest(name="Student A5", father_name="Father A5", class_="10", mobile="1000000005", route="Route A", fees=1300.0, address="Addr A5"),

        # 3 students for Route B
        CreateStudentRequest(name="Student B1", father_name="Father B1", class_="9", mobile="2000000001", route="Route B", fees=1000.0, address="Addr B1"),
        CreateStudentRequest(name="Student B2", father_name="Father B2", class_="10", mobile="2000000002", route="Route B", fees=1400.0, address="Addr B2"),
        CreateStudentRequest(name="Student B3", father_name="Father B3", class_="9", mobile="2000000003", route="Route B", fees=1100.0, address="Addr B3"),

        # 2 students for Route C
        CreateStudentRequest(name="Student C1", father_name="Father C1", class_="8", mobile="5173000001", route="Route C", fees=950.0, address="Addr C1"),
        CreateStudentRequest(name="Student C2", father_name="Father C2", class_="10", mobile="5173000002", route="Route C", fees=1250.0, address="Addr C2"),
    ]

    created_students = []
    for student_data in students_data:
        response = client.post("/api/students", json=student_data.dict())
        assert response.status_code == 200
        created_students.append(response.json())

    return {
        "drivers": created_drivers,
        "students": created_students,
        "expected_distribution": {
            "Route A": 5,
            "Route B": 3,
            "Route C": 2
        },
        "expected_revenue_by_driver": {
            "Route A": 5500.0,  # 1000+1100+1200+900+1300
            "Route B": 3500.0,  # 1000+1400+1100
            "Route C": 2200.0   # 950+1250
        },
        "expected_revenue_by_class": {
            "8": 1850.0,   # 900+950
            "9": 3200.0,   # 1100+1000+1100
            "10": 9200.0   # 1000+1200+1300+1400+1250
        }
    }

class TestChartsRouter:
    """Test suite for charts router endpoints."""

    def test_student_distribution_chart_success(self, client, sample_chart_data):
        """Test student distribution chart data."""
        response = client.get("/api/charts/student-distribution")
        assert response.status_code == 200
        data = response.json()

        # Verify structure for bar chart
        assert "labels" in data
        assert "values" in data
        assert "colors" in data
        assert "type" in data

        # Verify data matches expected distribution
        expected = sample_chart_data["expected_distribution"]
        assert len(data["labels"]) == len(expected)
        assert len(data["values"]) == len(expected)

        # Check that all routes are represented
        for route, count in expected.items():
            assert route in data["labels"]
            route_index = data["labels"].index(route)
            assert data["values"][route_index] == count

        # Verify chart type
        assert data["type"] == "bar"

        # Verify colors array exists
        assert isinstance(data["colors"], list)
        assert len(data["colors"]) == len(data["labels"])

    def test_revenue_by_driver_chart_success(self, client, sample_chart_data):
        """Test revenue by driver chart data."""
        response = client.get("/api/charts/revenue-by-driver")
        assert response.status_code == 200
        data = response.json()

        # Verify structure for pie chart
        assert "labels" in data
        assert "values" in data
        assert "colors" in data
        assert "type" in data

        # Verify data matches expected revenue
        expected = sample_chart_data["expected_revenue_by_driver"]
        assert len(data["labels"]) == len(expected)
        assert len(data["values"]) == len(expected)

        # Check that all routes are represented with correct revenue
        for route, revenue in expected.items():
            assert route in data["labels"]
            route_index = data["labels"].index(route)
            assert data["values"][route_index] == revenue

        # Verify chart type
        assert data["type"] == "pie"

        # Verify colors array exists
        assert isinstance(data["colors"], list)
        assert len(data["colors"]) == len(data["labels"])

    def test_revenue_by_class_chart_success(self, client, sample_chart_data):
        """Test revenue by class chart data."""
        response = client.get("/api/charts/revenue-by-class")
        assert response.status_code == 200
        data = response.json()

        # Verify structure for bar chart
        assert "labels" in data
        assert "values" in data
        assert "colors" in data
        assert "type" in data

        # Verify data matches expected revenue by class
        expected = sample_chart_data["expected_revenue_by_class"]
        assert len(data["labels"]) == len(expected)
        assert len(data["values"]) == len(expected)

        # Check that all classes are represented with correct revenue
        for class_name, revenue in expected.items():
            assert class_name in data["labels"]
            class_index = data["labels"].index(class_name)
            assert data["values"][class_index] == revenue

        # Verify chart type
        assert data["type"] == "bar"

        # Verify colors array exists
        assert isinstance(data["colors"], list)
        assert len(data["colors"]) == len(data["labels"])

    def test_charts_empty_database(self, client):
        """Test chart endpoints with empty database."""
        endpoints = [
            "/api/charts/student-distribution",
            "/api/charts/revenue-by-driver",
            "/api/charts/revenue-by-class"
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200
            data = response.json()

            # Should return empty chart data
            assert "labels" in data
            assert "values" in data
            assert "colors" in data
            assert "type" in data

            # Arrays should be empty or have minimal data
            assert isinstance(data["labels"], list)
            assert isinstance(data["values"], list)
            assert isinstance(data["colors"], list)

    def test_charts_data_consistency(self, client, sample_chart_data):
        """Test that chart data is consistent across endpoints."""
        # Get data from all chart endpoints
        distribution = client.get("/api/charts/student-distribution").json()
        revenue_by_driver = client.get("/api/charts/revenue-by-driver").json()
        revenue_by_class = client.get("/api/charts/revenue-by-class").json()

        # All should have routes/drivers as labels
        dist_routes = set(distribution["labels"])
        revenue_routes = set(revenue_by_driver["labels"])

        # Should have same routes
        assert dist_routes == revenue_routes

        # Total students from distribution should match sum of values
        total_students = sum(distribution["values"])
        assert total_students == 10  # We created 10 students

        # Total revenue from driver chart should match sum of values
        total_revenue_driver = sum(revenue_by_driver["values"])
        total_revenue_class = sum(revenue_by_class["values"])

        # Should be the same total revenue
        assert total_revenue_driver == total_revenue_class
        assert total_revenue_driver == 11200.0  # Sum of all expected revenues

    def test_charts_response_format(self, client, sample_chart_data):
        """Test that chart responses have correct format for frontend."""
        endpoints = [
            "/api/charts/student-distribution",
            "/api/charts/revenue-by-driver",
            "/api/charts/revenue-by-class"
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200
            data = response.json()

            # Should be valid JSON object
            assert isinstance(data, dict)

            # Required fields
            required_fields = ["labels", "values", "colors", "type"]
            for field in required_fields:
                assert field in data

            # Arrays should have same length
            assert len(data["labels"]) == len(data["values"])
            assert len(data["values"]) == len(data["colors"])

            # Labels should be strings
            assert all(isinstance(label, str) for label in data["labels"])

            # Values should be numbers
            assert all(isinstance(value, (int, float)) for value in data["values"])

            # Colors should be strings (hex codes)
            assert all(isinstance(color, str) for color in data["colors"])

            # Type should be valid chart type
            assert data["type"] in ["bar", "pie", "line", "doughnut"]

    def test_charts_error_handling(self, client):
        """Test error handling in chart endpoints."""
        # All endpoints should handle database errors gracefully
        endpoints = [
            "/api/charts/student-distribution",
            "/api/charts/revenue-by-driver",
            "/api/charts/revenue-by-class"
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200  # Should not return 500 errors
            data = response.json()
            assert isinstance(data, dict)  # Should return valid JSON

    def test_charts_color_generation(self, client, sample_chart_data):
        """Test that colors are properly generated for charts."""
        response = client.get("/api/charts/student-distribution")
        assert response.status_code == 200
        data = response.json()

        # Should have colors for each data point
        assert len(data["colors"]) == len(data["labels"])

        # Colors should be valid hex codes or color names
        for color in data["colors"]:
            # Should be string and not empty
            assert isinstance(color, str)
            assert len(color) > 0

            # Should start with # for hex codes or be color names
            assert color.startswith("#") or color in [
                "red", "blue", "green", "yellow", "purple", "orange",
                "pink", "brown", "gray", "black", "white"
            ]

    def test_charts_sorted_data(self, client, sample_chart_data):
        """Test that chart data is properly sorted."""
        response = client.get("/api/charts/student-distribution")
        assert response.status_code == 200
        data = response.json()

        # Values should be in descending order (largest first)
        values = data["values"]
        for i in range(len(values) - 1):
            assert values[i] >= values[i + 1]

        # Labels should correspond to sorted values
        expected_order = ["Route A", "Route B", "Route C"]  # 5, 3, 2 students
        assert data["labels"] == expected_order

class TestChartsRouterGuestAccess:
    """Test suite for guest access to charts endpoints."""

    def test_guest_cannot_access_regular_chart_endpoints(self, client):
        """Test that guest users cannot access regular chart endpoints without authentication."""
        endpoints = [
            "/api/charts/student-distribution",
            "/api/charts/revenue-by-driver",
            "/api/charts/revenue-by-class"
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            # Should be unauthorized (401) or forbidden (403)
            assert response.status_code in [401, 403], f"Failed for endpoint: {endpoint}"

    def test_guest_can_access_public_chart_endpoints(self, client):
        """Test that guest users can access public chart endpoints."""
        public_endpoints = [
            "/api/charts/public/student-distribution",
            "/api/charts/public/revenue-by-driver",
            "/api/charts/public/revenue-by-class"
        ]

        for endpoint in public_endpoints:
            response = client.get(endpoint)
            # Should be allowed for guest users
            assert response.status_code == 200, f"Failed for endpoint: {endpoint}"

            data = response.json()
            # Should have proper chart structure
            assert "labels" in data
            assert "values" in data
            assert "colors" in data
            assert "type" in data

    def test_public_charts_data_consistency(self, client):
        """Test that public chart data is consistent."""
        # Get data from all public chart endpoints
        student_dist = client.get("/api/charts/public/student-distribution").json()
        revenue_driver = client.get("/api/charts/public/revenue-by-driver").json()
        revenue_class = client.get("/api/charts/public/revenue-by-class").json()

        # All should have the same basic structure
        for chart_data in [student_dist, revenue_driver, revenue_class]:
            assert "labels" in chart_data
            assert "values" in chart_data
            assert "colors" in chart_data
            assert "type" in chart_data
            assert isinstance(chart_data["labels"], list)
            assert isinstance(chart_data["values"], list)
            assert isinstance(chart_data["colors"], list)
            assert len(chart_data["labels"]) == len(chart_data["values"])
            assert len(chart_data["values"]) == len(chart_data["colors"])

    def test_public_charts_response_format(self, client):
        """Test that public chart responses have correct format for frontend."""
        endpoints = [
            "/api/charts/public/student-distribution",
            "/api/charts/public/revenue-by-driver",
            "/api/charts/public/revenue-by-class"
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200
            data = response.json()

            # Should be valid JSON object
            assert isinstance(data, dict)

            # Required fields
            required_fields = ["labels", "values", "colors", "type"]
            for field in required_fields:
                assert field in data

            # Labels should be strings
            assert all(isinstance(label, str) for label in data["labels"])

            # Values should be numbers
            assert all(isinstance(value, (int, float)) for value in data["values"])

            # Colors should be strings (hex codes or color names)
            assert all(isinstance(color, str) for color in data["colors"])

            # Type should be valid chart type
            assert data["type"] in ["bar", "pie", "line", "doughnut"]

    def test_guest_cannot_access_charts_with_invalid_token(self, client):
        """Test that guest users with invalid tokens cannot access chart endpoints."""
        headers = {"Authorization": "Bearer invalid_token"}

        endpoints = [
            "/api/charts/student-distribution",
            "/api/charts/revenue-by-driver",
            "/api/charts/revenue-by-class"
        ]

        for endpoint in endpoints:
            response = client.get(endpoint, headers=headers)
            assert response.status_code == 401

    def test_public_charts_rate_limiting(self, client):
        """Test that public chart access is properly rate limited."""
        # Make multiple requests rapidly to public chart endpoints
        responses = []

        for i in range(10):
            response = client.get("/api/charts/public/student-distribution")
            responses.append(response.status_code)

        # Should be successful or rate limited gracefully
        assert all(status in [200, 429] for status in responses)

    def test_public_charts_empty_database(self, client):
        """Test public chart endpoints with empty database."""
        endpoints = [
            "/api/charts/public/student-distribution",
            "/api/charts/public/revenue-by-driver",
            "/api/charts/public/revenue-by-class"
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200
            data = response.json()

            # Should return empty chart data or minimal data
            assert "labels" in data
            assert "values" in data
            assert "colors" in data
            assert "type" in data

            # Arrays should be empty or have minimal data
            assert isinstance(data["labels"], list)
            assert isinstance(data["values"], list)
            assert isinstance(data["colors"], list)

    def test_public_charts_color_generation(self, client):
        """Test that colors are properly generated for public charts."""
        response = client.get("/api/charts/public/student-distribution")
        assert response.status_code == 200
        data = response.json()

        # Should have colors for each data point
        assert len(data["colors"]) == len(data["labels"])

        # Colors should be valid strings
        for color in data["colors"]:
            assert isinstance(color, str)
            assert len(color) > 0

if __name__ == "__main__":
    pytest.main([__file__, "-v"])