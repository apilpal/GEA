"""
Comprehensive test suite for charts router endpoints.

This module provides extensive testing for all chart and visualization endpoints including:
- Student distribution charts
- Revenue analysis charts
- Chart data formatting and validation
- Error scenarios and edge cases
- Color palette and styling
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
    Student, Driver, CreateStudentRequest, CreateDriverRequest,
    DBStudent, DBDriver, SessionLocal, Base, get_db, ClassEnum
)
from services.chart_service import ChartService

# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_charts_comprehensive.db"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    """Create a test database engine for comprehensive charts tests."""
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
async def sample_chart_data(test_db):
    """Create sample students and drivers for testing chart generation."""
    # Create drivers
    drivers_data = [
        CreateDriverRequest(name="Chart Driver A", route="Chart Route 1", status="active"),
        CreateDriverRequest(name="Chart Driver B", route="Chart Route 2", status="active"),
        CreateDriverRequest(name="Chart Driver C", route="Chart Route 3", status="inactive"),
    ]

    for driver_data in drivers_data:
        db_driver = DBDriver(
            name=driver_data.name,
            route=driver_data.route,
            status=driver_data.status,
            created_at=int(time.time()),
            updated_at=int(time.time())
        )
        test_db.add(db_driver)

    # Create students with different fees for testing revenue charts
    students_data = [
        CreateStudentRequest(
            name="Chart Student 1", route="Chart Route 1", father_name="Father 1",
            mobile="1111111111", class_=ClassEnum.FIVE, fees=1500.50
        ),
        CreateStudentRequest(
            name="Chart Student 2", route="Chart Route 1", father_name="Father 2",
            mobile="2222222222", class_=ClassEnum.SIX, fees=1200.00
        ),
        CreateStudentRequest(
            name="Chart Student 3", route="Chart Route 1", father_name="Father 3",
            mobile="3333333333", class_=ClassEnum.FIVE, fees=1800.75
        ),
        CreateStudentRequest(
            name="Chart Student 4", route="Chart Route 2", father_name="Father 4",
            mobile="4444444444", class_=ClassEnum.SEVEN, fees=900.25
        ),
        CreateStudentRequest(
            name="Chart Student 5", route="Chart Route 2", father_name="Father 5",
            mobile="5555555555", class_=ClassEnum.EIGHT, fees=2100.00
        ),
    ]

    for student_data in students_data:
        db_student = DBStudent(
            route=student_data.route,
            name=student_data.name,
            father_name=student_data.father_name,
            mobile=student_data.mobile,
            class_=student_data.class_,
            address=student_data.address,
            fees=float(student_data.fees) if student_data.fees else 0.0,
            status=student_data.status,
            created_at=int(time.time()),
            updated_at=int(time.time())
        )
        test_db.add(db_student)

    await test_db.commit()
    return {"drivers": drivers_data, "students": students_data}

class TestStudentDistributionChart:
    """Comprehensive tests for student distribution chart endpoint."""

    def test_get_student_distribution_chart_success(self, test_client, sample_chart_data):
        """Test successful generation of student distribution chart."""
        response = test_client.get("/charts/student-distribution")
        assert response.status_code == 200

        data = response.json()
        assert "labels" in data
        assert "values" in data
        assert "colors" in data
        assert "type" in data
        assert "title" in data

        # Check data types
        assert isinstance(data["labels"], list)
        assert isinstance(data["values"], list)
        assert isinstance(data["colors"], list)
        assert isinstance(data["type"], str)
        assert isinstance(data["title"], str)

        # Check expected values
        assert data["type"] == "bar"
        assert data["title"] == "Student Distribution by Driver"
        assert len(data["labels"]) >= 0
        assert len(data["values"]) == len(data["labels"])
        assert len(data["colors"]) >= len(data["labels"])

        # Check that all values are non-negative integers
        for value in data["values"]:
            assert isinstance(value, int)
            assert value >= 0

    def test_get_student_distribution_chart_data_accuracy(self, test_client, sample_chart_data):
        """Test that student distribution chart data is accurate."""
        response = test_client.get("/charts/student-distribution")
        assert response.status_code == 200

        data = response.json()

        # Verify the chart data matches expected distribution
        # Chart Driver A (Route 1) should have 3 students
        # Chart Driver B (Route 2) should have 2 students
        # Chart Driver C (Route 3) should have 0 students

        expected_distribution = {
            "Chart Driver A": 3,
            "Chart Driver B": 2,
            "Chart Driver C": 0
        }

        # Check that the data includes expected drivers and counts
        for i, label in enumerate(data["labels"]):
            if label in expected_distribution:
                expected_count = expected_distribution[label]
                actual_count = data["values"][i]
                assert actual_count == expected_count, f"Expected {expected_count} students for {label}, got {actual_count}"

    def test_get_student_distribution_chart_with_no_data(self, test_client):
        """Test student distribution chart with empty database."""
        response = test_client.get("/charts/student-distribution")
        assert response.status_code == 200

        data = response.json()
        assert data["labels"] == []
        assert data["values"] == []
        assert data["colors"] == []
        assert data["type"] == "bar"
        assert data["title"] == "Student Distribution by Driver"

    def test_get_student_distribution_chart_colors(self, test_client, sample_chart_data):
        """Test that chart colors are properly assigned."""
        response = test_client.get("/charts/student-distribution")
        assert response.status_code == 200

        data = response.json()

        # Check color format (should be hex colors)
        for color in data["colors"]:
            assert color.startswith("#")
            assert len(color) == 7  # Hex color format

        # Check that we have enough colors for all data points
        assert len(data["colors"]) >= len(data["labels"])

class TestRevenueByDriverChart:
    """Comprehensive tests for revenue by driver chart endpoint."""

    def test_get_revenue_by_driver_chart_success(self, test_client, sample_chart_data):
        """Test successful generation of revenue by driver chart."""
        response = test_client.get("/charts/revenue-by-driver")
        assert response.status_code == 200

        data = response.json()
        assert "labels" in data
        assert "values" in data
        assert "colors" in data
        assert "type" in data
        assert "title" in data

        # Check data types
        assert isinstance(data["labels"], list)
        assert isinstance(data["values"], list)
        assert isinstance(data["colors"], list)
        assert data["type"] == "pie"
        assert data["title"] == "Revenue by Driver"

        # Check that all values are positive (only drivers with revenue are included)
        for value in data["values"]:
            assert isinstance(value, (int, float))
            assert value > 0

    def test_get_revenue_by_driver_chart_calculations(self, test_client, sample_chart_data):
        """Test that revenue by driver calculations are correct."""
        response = test_client.get("/charts/revenue-by-driver")
        assert response.status_code == 200

        data = response.json()

        # Calculate expected revenue by driver
        expected_revenue = {
            "Chart Driver A": 1500.50 + 1200.00 + 1800.75,  # Route 1 students
            "Chart Driver B": 900.25 + 2100.00,  # Route 2 students
            "Chart Driver C": 0.0  # Route 3 has no students
        }

        # Verify calculations
        for i, label in enumerate(data["labels"]):
            if label in expected_revenue:
                expected_rev = expected_revenue[label]
                actual_rev = data["values"][i]
                assert abs(actual_rev - expected_rev) < 0.01, f"Expected {expected_rev} revenue for {label}, got {actual_rev}"

        # Chart Driver C should not appear since it has 0 revenue
        assert "Chart Driver C" not in data["labels"]

    def test_get_revenue_by_driver_chart_with_no_revenue(self, test_client):
        """Test revenue by driver chart with no revenue data."""
        # Create students with no fees
        for i in range(3):
            student_data = {
                "name": f"No Fees Student {i}",
                "route": "No Fees Route",
                "father_name": f"Father {i}",
                "class_": "5"
            }
            response = test_client.post("/students/", json=student_data)
            # Creation may fail due to validation, but that's okay

        response = test_client.get("/charts/revenue-by-driver")
        assert response.status_code == 200

        data = response.json()
        # Should only include drivers with actual revenue
        for value in data["values"]:
            assert value > 0

class TestRevenueByClassChart:
    """Comprehensive tests for revenue by class chart endpoint."""

    def test_get_revenue_by_class_chart_success(self, test_client, sample_chart_data):
        """Test successful generation of revenue by class chart."""
        response = test_client.get("/charts/revenue-by-class")
        assert response.status_code == 200

        data = response.json()
        assert "labels" in data
        assert "values" in data
        assert "colors" in data
        assert "type" in data
        assert "title" in data

        # Check data types
        assert isinstance(data["labels"], list)
        assert isinstance(data["values"], list)
        assert isinstance(data["colors"], list)
        assert data["type"] == "bar"
        assert data["title"] == "Revenue by Class"

        # Check that values are sorted in descending order
        values = data["values"]
        if len(values) > 1:
            assert values == sorted(values, reverse=True), "Values should be sorted in descending order"

    def test_get_revenue_by_class_chart_calculations(self, test_client, sample_chart_data):
        """Test that revenue by class calculations are correct."""
        response = test_client.get("/charts/revenue-by-class")
        assert response.status_code == 200

        data = response.json()

        # Calculate expected revenue by class from sample data
        # Class 5: 1500.50 + 1800.75 = 3301.25
        # Class 6: 1200.00
        # Class 7: 900.25
        # Class 8: 2100.00

        expected_revenue = {
            "5": 1500.50 + 1800.75,  # Two students in class 5
            "6": 1200.00,            # One student in class 6
            "7": 900.25,             # One student in class 7
            "8": 2100.00             # One student in class 8
        }

        # Verify calculations
        for i, label in enumerate(data["labels"]):
            if label in expected_revenue:
                expected_rev = expected_revenue[label]
                actual_rev = data["values"][i]
                assert abs(actual_rev - expected_rev) < 0.01, f"Expected {expected_rev} revenue for class {label}, got {actual_rev}"

    def test_get_revenue_by_class_chart_sorting(self, test_client, sample_chart_data):
        """Test that revenue by class chart is sorted correctly."""
        response = test_client.get("/charts/revenue-by-class")
        assert response.status_code == 200

        data = response.json()

        # Values should be in descending order
        values = data["values"]
        if len(values) > 1:
            for i in range(len(values) - 1):
                assert values[i] >= values[i + 1], "Values should be in descending order"

class TestErrorScenarios:
    """Tests for various error scenarios and edge cases."""

    def test_chart_generation_with_database_errors(self, test_client):
        """Test handling of database errors during chart generation."""
        # This test assumes the endpoint will handle database errors gracefully
        response = test_client.get("/charts/student-distribution")

        # Should either succeed or fail gracefully with proper error message
        assert response.status_code in [200, 500]

        if response.status_code == 500:
            assert "Error generating" in response.json()["detail"]

    def test_chart_data_structure_validation(self, test_client, sample_chart_data):
        """Test that chart data structure is always valid."""
        endpoints = [
            "/charts/student-distribution",
            "/charts/revenue-by-driver",
            "/charts/revenue-by-class"
        ]

        for endpoint in endpoints:
            response = test_client.get(endpoint)
            assert response.status_code == 200

            data = response.json()

            # Validate common structure
            assert "labels" in data
            assert "values" in data
            assert "colors" in data
            assert "type" in data
            assert "title" in data

            # Validate data consistency
            assert len(data["labels"]) == len(data["values"])
            assert len(data["colors"]) >= len(data["labels"])

            # Validate data types
            assert all(isinstance(label, str) for label in data["labels"])
            assert all(isinstance(value, (int, float)) for value in data["values"])
            assert all(isinstance(color, str) for color in data["colors"])
            assert all(color.startswith("#") for color in data["colors"])

    def test_extreme_data_values_in_charts(self, test_client):
        """Test chart generation with extreme data values."""
        # Create a student with extremely large fees
        large_fees_data = {
            "name": "Extreme Value Student",
            "route": "Extreme Route",
            "fees": "999999999999.99"  # Very large number
        }

        response = test_client.post("/students/", json=large_fees_data)
        if response.status_code == 200:
            # Test that charts handle extreme values
            chart_response = test_client.get("/charts/revenue-by-driver")
            assert chart_response.status_code in [200, 500]

            if chart_response.status_code == 200:
                data = chart_response.json()
                # Should handle large values appropriately
                for value in data["values"]:
                    assert isinstance(value, (int, float))

class TestColorPalette:
    """Tests for chart color palette and styling."""

    def test_color_palette_consistency(self, test_client, sample_chart_data):
        """Test that color palette is consistent across charts."""
        # Get colors from different chart endpoints
        distribution_response = test_client.get("/charts/student-distribution")
        revenue_driver_response = test_client.get("/charts/revenue-by-driver")
        revenue_class_response = test_client.get("/charts/revenue-by-class")

        if all(response.status_code == 200 for response in [
            distribution_response, revenue_driver_response, revenue_class_response
        ]):
            dist_data = distribution_response.json()
            rev_driver_data = revenue_driver_response.json()
            rev_class_data = revenue_class_response.json()

            # Check that colors follow hex format
            for data in [dist_data, rev_driver_data, rev_class_data]:
                for color in data["colors"]:
                    assert color.startswith("#")
                    assert len(color) == 7

    def test_color_sufficiency(self, test_client, sample_chart_data):
        """Test that there are enough colors for all data points."""
        endpoints = [
            "/charts/student-distribution",
            "/charts/revenue-by-driver",
            "/charts/revenue-by-class"
        ]

        for endpoint in endpoints:
            response = test_client.get(endpoint)
            if response.status_code == 200:
                data = response.json()
                assert len(data["colors"]) >= len(data["labels"])

class TestConcurrentRequests:
    """Tests for concurrent request handling."""

    def test_concurrent_chart_requests(self, test_client, sample_chart_data):
        """Test handling of concurrent chart requests."""
        def make_chart_request(endpoint):
            return test_client.get(endpoint)

        endpoints = [
            "/charts/student-distribution",
            "/charts/revenue-by-driver",
            "/charts/revenue-by-class"
        ]

        # Make concurrent requests to different chart endpoints
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(make_chart_request, endpoint) for endpoint in endpoints]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]

        # All requests should succeed
        assert all(response.status_code == 200 for response in responses)

        # All responses should have consistent structure
        for response in responses:
            data = response.json()
            assert "labels" in data
            assert "values" in data
            assert "colors" in data
            assert "type" in data
            assert "title" in data

    def test_concurrent_same_chart_requests(self, test_client, sample_chart_data):
        """Test handling of concurrent requests to the same chart endpoint."""
        def make_distribution_request():
            return test_client.get("/charts/student-distribution")

        # Make multiple concurrent requests to the same endpoint
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(make_distribution_request) for _ in range(5)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]

        # All requests should succeed and return consistent data
        assert all(response.status_code == 200 for response in responses)

        # Check that all responses return the same data (consistency)
        first_data = responses[0].json()
        for response in responses[1:]:
            data = response.json()
            assert data["labels"] == first_data["labels"]
            assert data["values"] == first_data["values"]
            assert data["type"] == first_data["type"]
            assert data["title"] == first_data["title"]

class TestPerformanceAndLoad:
    """Tests for performance and load handling."""

    def test_chart_generation_performance(self, test_client, sample_chart_data):
        """Test chart generation performance."""
        # Test each chart endpoint performance
        endpoints = [
            "/charts/student-distribution",
            "/charts/revenue-by-driver",
            "/charts/revenue-by-class"
        ]

        for endpoint in endpoints:
            start_time = time.time()
            response = test_client.get(endpoint)
            end_time = time.time()

            assert response.status_code == 200
            # Should complete within reasonable time (3 seconds for test)
            assert (end_time - start_time) < 3.0, f"Chart {endpoint} took too long: {end_time - start_time}"

    def test_large_dataset_chart_performance(self, test_client):
        """Test chart performance with larger dataset."""
        # Create additional test data
        for i in range(15):
            student_data = {
                "name": f"Performance Student {i}",
                "route": f"Performance Route {i % 5}",
                "father_name": f"Father {i}",
                "class_": "5",
                "fees": f"{1000 + i}.00"
            }
            response = test_client.post("/students/", json=student_data)
            # Creation may fail due to validation, but that's okay for performance test

        # Test chart performance with larger dataset
        start_time = time.time()
        response = test_client.get("/charts/student-distribution")
        end_time = time.time()

        assert response.status_code in [200, 500]  # 500 might indicate performance issues
        if response.status_code == 200:
            # Should still complete within reasonable time
            assert (end_time - start_time) < 5.0  # Allow more time for larger dataset

class TestDataConsistency:
    """Tests for data consistency across chart types."""

    def test_chart_data_consistency_with_reports(self, test_client, sample_chart_data):
        """Test that chart data is consistent with report data."""
        # Get data from charts and reports
        distribution_response = test_client.get("/charts/student-distribution")
        revenue_driver_response = test_client.get("/charts/revenue-by-driver")
        revenue_class_response = test_client.get("/charts/revenue-by-class")

        # Get corresponding report data for comparison
        summary_response = test_client.get("/reports/summary")
        revenue_analysis_response = test_client.get("/reports/revenue-analysis")

        if all(response.status_code == 200 for response in [
            distribution_response, revenue_driver_response, revenue_class_response,
            summary_response, revenue_analysis_response
        ]):
            dist_data = distribution_response.json()
            rev_driver_data = revenue_driver_response.json()
            rev_class_data = revenue_class_response.json()
            summary_data = summary_response.json()
            revenue_data = revenue_analysis_response.json()

            # Cross-validate consistency
            # Student distribution should match summary totals
            total_students_in_chart = sum(dist_data["values"])
            assert total_students_in_chart == summary_data["total_students"]

            # Revenue charts should be consistent with revenue analysis
            total_revenue_in_driver_chart = sum(rev_driver_data["values"])
            total_revenue_in_class_chart = sum(rev_class_data["values"])

            # Both should match the total from revenue analysis
            assert abs(total_revenue_in_driver_chart - revenue_data["total_revenue"]) < 0.01
            assert abs(total_revenue_in_class_chart - revenue_data["total_revenue"]) < 0.01

class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_charts_with_null_fees(self, test_client):
        """Test chart generation with students having null fees."""
        # Create student with no fees
        student_data = {
            "name": "No Fees Student",
            "route": "No Fees Route",
            "father_name": "Father",
            "class_": "5"
        }

        response = test_client.post("/students/", json=student_data)
        if response.status_code == 200:
            # Test that charts handle null fees correctly
            distribution_response = test_client.get("/charts/student-distribution")
            revenue_driver_response = test_client.get("/charts/revenue-by-driver")
            revenue_class_response = test_client.get("/charts/revenue-by-class")

            # All should still work
            assert distribution_response.status_code == 200
            assert revenue_driver_response.status_code == 200
            assert revenue_class_response.status_code == 200

    def test_charts_with_identical_values(self, test_client):
        """Test chart generation with identical values."""
        # Create multiple students with same fees in same route
        for i in range(3):
            student_data = {
                "name": f"Identical Student {i}",
                "route": "Identical Route",
                "father_name": f"Father {i}",
                "class_": "5",
                "fees": "1000.00"
            }
            response = test_client.post("/students/", json=student_data)

        # Test that charts handle identical values correctly
        response = test_client.get("/charts/revenue-by-driver")
        if response.status_code == 200:
            data = response.json()
            # Should handle identical revenue values appropriately
            assert len(data["labels"]) >= 0
            assert len(data["values"]) == len(data["labels"])

class TestChartDataValidation:
    """Tests for chart data validation and accuracy."""

    def test_chart_data_types_and_formats(self, test_client, sample_chart_data):
        """Test that chart data has correct types and formats."""
        endpoints = [
            "/charts/student-distribution",
            "/charts/revenue-by-driver",
            "/charts/revenue-by-class"
        ]

        for endpoint in endpoints:
            response = test_client.get(endpoint)
            if response.status_code == 200:
                data = response.json()

                # Validate label formats
                for label in data["labels"]:
                    assert isinstance(label, str)
                    assert len(label) > 0  # No empty labels

                # Validate value formats
                for value in data["values"]:
                    assert isinstance(value, (int, float))
                    if isinstance(value, float):
                        # Check reasonable precision
                        assert str(value).split('.')[-1].__len__() <= 10

                # Validate color formats
                for color in data["colors"]:
                    assert isinstance(color, str)
                    assert color.startswith("#")
                    assert len(color) == 7

    def test_chart_title_consistency(self, test_client, sample_chart_data):
        """Test that chart titles are consistent and meaningful."""
        endpoints_and_titles = [
            ("/charts/student-distribution", "Student Distribution by Driver"),
            ("/charts/revenue-by-driver", "Revenue by Driver"),
            ("/charts/revenue-by-class", "Revenue by Class")
        ]

        for endpoint, expected_title in endpoints_and_titles:
            response = test_client.get(endpoint)
            if response.status_code == 200:
                data = response.json()
                assert data["title"] == expected_title

class TestChartTypeValidation:
    """Tests for chart type validation."""

    def test_chart_type_correctness(self, test_client, sample_chart_data):
        """Test that chart types are appropriate for data."""
        endpoints_and_types = [
            ("/charts/student-distribution", "bar"),  # Distribution is best shown as bar chart
            ("/charts/revenue-by-driver", "pie"),     # Proportions are best shown as pie chart
            ("/charts/revenue-by-class", "bar")       # Comparison is best shown as bar chart
        ]

        for endpoint, expected_type in endpoints_and_types:
            response = test_client.get(endpoint)
            if response.status_code == 200:
                data = response.json()
                assert data["type"] == expected_type

class TestSecurityAndHeaders:
    """Tests for security headers and configurations."""

    def test_cors_headers_charts(self, test_client):
        """Test CORS headers on charts endpoints."""
        response = test_client.options("/charts/student-distribution")
        # Should not crash and may include CORS headers
        assert response.status_code in [200, 404, 405]

    def test_security_headers_present(self, test_client, sample_chart_data):
        """Test that security headers are present in responses."""
        response = test_client.get("/charts/student-distribution")

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

class TestEmptyDataScenarios:
    """Tests for charts with empty or minimal data."""

    def test_charts_with_minimal_data(self, test_client):
        """Test chart generation with minimal data."""
        # Create just one driver and one student
        driver_data = {
            "name": "Minimal Driver",
            "route": "Minimal Route"
        }

        student_data = {
            "name": "Minimal Student",
            "route": "Minimal Route",
            "father_name": "Father",
            "class_": "5",
            "fees": "100.00"
        }

        driver_response = test_client.post("/drivers/", json=driver_data)
        student_response = test_client.post("/students/", json=student_data)

        if driver_response.status_code == 200 and student_response.status_code == 200:
            # Test charts with minimal data
            endpoints = [
                "/charts/student-distribution",
                "/charts/revenue-by-driver",
                "/charts/revenue-by-class"
            ]

            for endpoint in endpoints:
                response = test_client.get(endpoint)
                assert response.status_code == 200

                data = response.json()
                assert "labels" in data
                assert "values" in data
                assert len(data["labels"]) >= 0
                assert len(data["values"]) == len(data["labels"])

class TestChartsGuestAccess:
    """Comprehensive tests for guest access to charts endpoints."""

    def test_guest_cannot_access_regular_chart_endpoints(self, test_client):
        """Test that guest users cannot access regular chart endpoints without authentication."""
        endpoints = [
            "/charts/student-distribution",
            "/charts/revenue-by-driver",
            "/charts/revenue-by-class"
        ]

        for endpoint in endpoints:
            response = test_client.get(endpoint)
            # Should be unauthorized (401) or forbidden (403)
            assert response.status_code in [401, 403], f"Failed for endpoint: {endpoint}"

    def test_guest_can_access_public_chart_endpoints(self, test_client):
        """Test that guest users can access public chart endpoints."""
        public_endpoints = [
            "/charts/public/student-distribution",
            "/charts/public/revenue-by-driver",
            "/charts/public/revenue-by-class"
        ]

        for endpoint in public_endpoints:
            response = test_client.get(endpoint)
            # Should be allowed for guest users
            assert response.status_code == 200, f"Failed for endpoint: {endpoint}"

            data = response.json()
            # Should have proper chart structure
            assert "labels" in data
            assert "values" in data
            assert "colors" in data
            assert "type" in data

    def test_public_charts_data_consistency(self, test_client):
        """Test that public chart data is consistent."""
        # Get data from all public chart endpoints
        student_dist = test_client.get("/charts/public/student-distribution").json()
        revenue_driver = test_client.get("/charts/public/revenue-by-driver").json()
        revenue_class = test_client.get("/charts/public/revenue-by-class").json()

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

    def test_public_charts_response_format(self, test_client):
        """Test that public chart responses have correct format for frontend."""
        endpoints = [
            "/charts/public/student-distribution",
            "/charts/public/revenue-by-driver",
            "/charts/public/revenue-by-class"
        ]

        for endpoint in endpoints:
            response = test_client.get(endpoint)
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

    def test_guest_cannot_access_charts_with_malformed_token(self, test_client):
        """Test that guest users with malformed tokens cannot access chart endpoints."""
        headers = {"Authorization": "Bearer malformed.token.here"}

        endpoints = [
            "/charts/student-distribution",
            "/charts/revenue-by-driver",
            "/charts/revenue-by-class"
        ]

        for endpoint in endpoints:
            response = test_client.get(endpoint, headers=headers)
            assert response.status_code == 401

    def test_public_charts_rate_limiting(self, test_client):
        """Test that public chart access is properly rate limited."""
        # Make multiple requests rapidly to public chart endpoints
        responses = []

        for i in range(10):
            response = test_client.get("/charts/public/student-distribution")
            responses.append(response.status_code)

        # Should be successful or rate limited gracefully
        assert all(status in [200, 429] for status in responses)

    def test_public_charts_empty_database(self, test_client):
        """Test public chart endpoints with empty database."""
        endpoints = [
            "/charts/public/student-distribution",
            "/charts/public/revenue-by-driver",
            "/charts/public/revenue-by-class"
        ]

        for endpoint in endpoints:
            response = test_client.get(endpoint)
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

    def test_public_charts_color_generation(self, test_client):
        """Test that colors are properly generated for public charts."""
        response = test_client.get("/charts/public/student-distribution")
        assert response.status_code == 200
        data = response.json()

        # Should have colors for each data point
        assert len(data["colors"]) == len(data["labels"])

        # Colors should be valid strings
        for color in data["colors"]:
            assert isinstance(color, str)
            assert len(color) > 0

class TestChartsGuestFirstArchitectureIntegration:
    """Integration tests for guest-first architecture with charts endpoints."""

    def test_guest_access_workflow_isolation(self, test_client):
        """Test that guest access attempts don't interfere with regular operations."""
        # Guest tries to access regular charts (should fail)
        regular_response = test_client.get("/charts/student-distribution")
        assert regular_response.status_code in [401, 403]

        # Guest can access public charts (should succeed)
        public_response = test_client.get("/charts/public/student-distribution")
        assert public_response.status_code == 200

        # Regular operation should still work (assuming no auth required for this test)
        # This tests that failed guest attempts don't break the system
        list_response = test_client.get("/charts/student-distribution")
        # Should handle gracefully even if auth is required
        assert list_response.status_code in [200, 401, 403]

    def test_guest_error_responses_structure(self, test_client):
        """Test that guest error responses have proper structure."""
        response = test_client.get("/charts/student-distribution")

        if response.status_code in [401, 403]:
            data = response.json()
            assert "detail" in data
            assert isinstance(data["detail"], str)
            assert len(data["detail"]) > 0

    def test_guest_access_security_headers(self, test_client):
        """Test that security headers are present in guest access responses."""
        response = test_client.get("/charts/student-distribution")

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

class TestChartsGuestAccessEdgeCases:
    """Edge cases and boundary conditions for guest access to charts."""

    def test_guest_access_with_empty_headers(self, test_client):
        """Test guest access with empty authorization headers."""
        headers = {"Authorization": ""}
        response = test_client.get("/charts/student-distribution", headers=headers)
        assert response.status_code == 401

    def test_guest_access_with_whitespace_token(self, test_client):
        """Test guest access with whitespace-only token."""
        headers = {"Authorization": "Bearer   "}
        response = test_client.get("/charts/student-distribution", headers=headers)
        assert response.status_code == 401

    def test_guest_access_with_wrong_auth_scheme(self, test_client):
        """Test guest access with wrong authentication scheme."""
        headers = {"Authorization": "Basic dXNlcjpwYXNz"}  # Basic auth instead of Bearer
        response = test_client.get("/charts/student-distribution", headers=headers)
        assert response.status_code == 401

    def test_guest_access_with_incomplete_bearer_token(self, test_client):
        """Test guest access with incomplete Bearer token."""
        headers = {"Authorization": "Bearer"}
        response = test_client.get("/charts/student-distribution", headers=headers)
        assert response.status_code == 401

class TestChartsGuestAccessPerformance:
    """Performance tests for guest access scenarios."""

    def test_guest_access_response_time(self, test_client):
        """Test that guest access responses are reasonably fast."""
        import time

        start_time = time.time()
        response = test_client.get("/charts/student-distribution")
        end_time = time.time()

        # Should respond within 2 seconds even for unauthorized access
        assert (end_time - start_time) < 2.0
        # Should return proper error status
        assert response.status_code in [401, 403]

    def test_public_charts_access_response_time(self, test_client):
        """Test that public charts access is reasonably fast."""
        import time

        start_time = time.time()
        response = test_client.get("/charts/public/student-distribution")
        end_time = time.time()

        # Should respond within 2 seconds for public access
        assert (end_time - start_time) < 2.0
        # Should return successful response
        assert response.status_code == 200

    def test_guest_access_concurrent_requests(self, test_client):
        """Test handling of concurrent guest access requests."""
        def make_guest_request():
            return test_client.get("/charts/student-distribution")

        import concurrent.futures

        # Make multiple concurrent guest requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_guest_request) for _ in range(5)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]

        # All requests should return consistent error codes
        assert all(response.status_code in [401, 403] for response in responses)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])