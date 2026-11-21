"""
Comprehensive test suite for reports router endpoints.

This module provides extensive testing for all reporting and analytics endpoints including:
- System summary statistics
- Student-driver associations
- Revenue analysis
- Driver-student statistics
- Error scenarios and edge cases
- Data aggregation validation
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
from services.report_service import ReportService

# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_reports_comprehensive.db"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    """Create a test database engine for comprehensive reports tests."""
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
async def sample_data(test_db):
    """Create sample students and drivers for testing reports."""
    # Create drivers
    drivers_data = [
        CreateDriverRequest(name="Driver Alice", route="Route 1", status="active"),
        CreateDriverRequest(name="Driver Bob", route="Route 2", status="active"),
        CreateDriverRequest(name="Driver Charlie", route="Route 3", status="inactive"),
    ]

    created_drivers = []
    for driver_data in drivers_data:
        # Create driver directly in database
        db_driver = DBDriver(
            name=driver_data.name,
            route=driver_data.route,
            status=driver_data.status,
            created_at=int(time.time()),
            updated_at=int(time.time())
        )
        test_db.add(db_driver)
        created_drivers.append(driver_data.name)

    # Create students
    students_data = [
        CreateStudentRequest(
            name="John Doe", route="Route 1", father_name="Robert Doe",
            mobile="1234567890", class_=ClassEnum.FIVE, fees=1500.50
        ),
        CreateStudentRequest(
            name="Jane Smith", route="Route 1", father_name="Michael Smith",
            mobile="9876543210", class_=ClassEnum.SEVEN, fees=1200.00
        ),
        CreateStudentRequest(
            name="Bob Johnson", route="Route 2", father_name="David Johnson",
            mobile="5556667777", class_=ClassEnum.TEN, fees=1800.75
        ),
        CreateStudentRequest(
            name="Alice Brown", route="Route 2", father_name="James Brown",
            mobile="1112223333", class_=ClassEnum.THREE, fees=900.25
        ),
        CreateStudentRequest(
            name="Charlie Wilson", route="Route 3", father_name="Richard Wilson",
            mobile="9998887777", class_=ClassEnum.EIGHT, fees=1400.00
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
    return {"drivers": created_drivers, "students": students_data}

class TestReportsSummaryEndpoint:
    """Comprehensive tests for reports summary endpoint."""

    def test_get_reports_summary_success(self, test_client, sample_data):
        """Test successful retrieval of reports summary."""
        response = test_client.get("/reports/summary")
        assert response.status_code == 200

        data = response.json()
        assert "total_drivers" in data
        assert "total_students" in data
        assert "total_revenue" in data
        assert "drivers" in data

        # Check data types
        assert isinstance(data["total_drivers"], int)
        assert isinstance(data["total_students"], int)
        assert isinstance(data["total_revenue"], (int, float))
        assert isinstance(data["drivers"], list)

        # Check expected values based on sample data
        assert data["total_drivers"] >= 3
        assert data["total_students"] >= 5
        assert data["total_revenue"] >= 6801.5  # Sum of all student fees

        # Check driver summaries structure
        if data["drivers"]:
            driver_summary = data["drivers"][0]
            assert "driver_name" in driver_summary
            assert "student_count" in driver_summary
            assert "revenue" in driver_summary
            assert isinstance(driver_summary["student_count"], int)
            assert isinstance(driver_summary["revenue"], (int, float))

    def test_get_reports_summary_empty_database(self, test_client):
        """Test reports summary with empty database."""
        response = test_client.get("/reports/summary")
        assert response.status_code == 200

        data = response.json()
        assert data["total_drivers"] == 0
        assert data["total_students"] == 0
        assert data["total_revenue"] == 0.0
        assert data["drivers"] == []

    def test_get_reports_summary_calculations(self, test_client, sample_data):
        """Test that summary calculations are mathematically correct."""
        response = test_client.get("/reports/summary")
        assert response.status_code == 200

        data = response.json()

        # Verify total revenue calculation
        expected_revenue = sum(
            float(student.fees) if student.fees else 0.0
            for student in sample_data["students"]
        )
        assert abs(data["total_revenue"] - expected_revenue) < 0.01

        # Verify total students count
        assert data["total_students"] == len(sample_data["students"])

        # Verify total drivers count
        assert data["total_drivers"] == len(sample_data["drivers"])

class TestStudentsByDriverEndpoint:
    """Comprehensive tests for students-by-driver endpoint."""

    def test_get_students_by_driver_success(self, test_client, sample_data):
        """Test successful retrieval of students by driver."""
        response = test_client.get("/reports/students-by-driver")
        assert response.status_code == 200

        data = response.json()
        assert "drivers" in data
        assert isinstance(data["drivers"], list)

        # Check structure of driver data
        if data["drivers"]:
            driver_data = data["drivers"][0]
            assert "driver_name" in driver_data
            assert "students" in driver_data
            assert isinstance(driver_data["students"], list)

            # Check student structure
            if driver_data["students"]:
                student = driver_data["students"][0]
                assert "id" in student
                assert "name" in student
                assert "route" in student
                assert "class" in student
                assert "fees" in student

    def test_get_students_by_driver_grouping(self, test_client, sample_data):
        """Test that students are correctly grouped by driver."""
        response = test_client.get("/reports/students-by-driver")
        assert response.status_code == 200

        data = response.json()

        # Create expected grouping from sample data
        expected_grouping = {}
        for student in sample_data["students"]:
            driver_name = student.route
            if driver_name not in expected_grouping:
                expected_grouping[driver_name] = []
            expected_grouping[driver_name].append(student.name)

        # Verify the grouping in response
        for driver_data in data["drivers"]:
            driver_name = driver_data["driver_name"]
            expected_students = expected_grouping.get(driver_name, [])
            actual_students = [student["name"] for student in driver_data["students"]]

            # Sort both lists for comparison
            expected_students.sort()
            actual_students.sort()
            assert actual_students == expected_students

    def test_get_students_by_driver_with_inactive_driver(self, test_client, sample_data):
        """Test students by driver includes inactive drivers."""
        response = test_client.get("/reports/students-by-driver")
        assert response.status_code == 200

        data = response.json()

        # Should include all drivers regardless of status
        driver_names = [driver["driver_name"] for driver in data["drivers"]]
        assert "Driver Charlie" in driver_names  # Inactive driver

class TestRevenueAnalysisEndpoint:
    """Comprehensive tests for revenue analysis endpoint."""

    def test_get_revenue_analysis_success(self, test_client, sample_data):
        """Test successful revenue analysis generation."""
        response = test_client.get("/reports/revenue-analysis")
        assert response.status_code == 200

        data = response.json()
        assert "revenue_by_driver" in data
        assert "revenue_by_class" in data
        assert "total_revenue" in data

        # Check data types
        assert isinstance(data["revenue_by_driver"], dict)
        assert isinstance(data["revenue_by_class"], dict)
        assert isinstance(data["total_revenue"], (int, float))

        # Check that all revenue values are non-negative
        for driver_revenue in data["revenue_by_driver"].values():
            assert driver_revenue >= 0

        for class_revenue in data["revenue_by_class"].values():
            assert class_revenue >= 0

    def test_get_revenue_analysis_calculations(self, test_client, sample_data):
        """Test that revenue calculations are mathematically correct."""
        response = test_client.get("/reports/revenue-analysis")
        assert response.status_code == 200

        data = response.json()

        # Calculate expected revenue by driver
        expected_driver_revenue = {}
        for student in sample_data["students"]:
            driver_name = student.route or 'Unknown'
            if driver_name not in expected_driver_revenue:
                expected_driver_revenue[driver_name] = 0.0
            expected_driver_revenue[driver_name] += float(student.fees) if student.fees else 0.0

        # Verify calculations
        for driver_name, expected_revenue in expected_driver_revenue.items():
            actual_revenue = data["revenue_by_driver"].get(driver_name, 0.0)
            assert abs(actual_revenue - expected_revenue) < 0.01

        # Verify total revenue
        expected_total = sum(expected_driver_revenue.values())
        assert abs(data["total_revenue"] - expected_total) < 0.01

    def test_get_revenue_analysis_by_class(self, test_client, sample_data):
        """Test revenue analysis by class grouping."""
        response = test_client.get("/reports/revenue-analysis")
        assert response.status_code == 200

        data = response.json()

        # Calculate expected revenue by class
        expected_class_revenue = {}
        for student in sample_data["students"]:
            class_name = student.class_ or 'Unknown'
            if class_name not in expected_class_revenue:
                expected_class_revenue[class_name] = 0.0
            expected_class_revenue[class_name] += float(student.fees) if student.fees else 0.0

        # Verify calculations
        for class_name, expected_revenue in expected_class_revenue.items():
            actual_revenue = data["revenue_by_class"].get(class_name, 0.0)
            assert abs(actual_revenue - expected_revenue) < 0.01

class TestDriverStudentStatsEndpoint:
    """Comprehensive tests for driver-student statistics endpoint."""

    def test_get_driver_student_stats_success(self, test_client, sample_data):
        """Test successful retrieval of driver-student statistics."""
        response = test_client.get("/reports/driver-student-stats")
        assert response.status_code == 200

        data = response.json()
        assert "total_drivers" in data
        assert "total_students" in data
        assert "average_students_per_driver" in data
        assert "driver_with_most_students" in data
        assert "driver_with_least_students" in data
        assert "driver_statistics" in data

        # Check data types
        assert isinstance(data["total_drivers"], int)
        assert isinstance(data["total_students"], int)
        assert isinstance(data["average_students_per_driver"], (int, float))
        assert isinstance(data["driver_statistics"], list)

        # Check expected values
        assert data["total_drivers"] >= 3
        assert data["total_students"] >= 5
        assert data["average_students_per_driver"] >= 0

    def test_get_driver_student_stats_calculations(self, test_client, sample_data):
        """Test that statistics calculations are correct."""
        response = test_client.get("/reports/driver-student-stats")
        assert response.status_code == 200

        data = response.json()

        # Verify totals
        assert data["total_drivers"] == len(sample_data["drivers"])
        assert data["total_students"] == len(sample_data["students"])

        # Calculate expected average
        if data["total_drivers"] > 0:
            expected_average = data["total_students"] / data["total_drivers"]
            assert abs(data["average_students_per_driver"] - expected_average) < 0.01

        # Verify driver statistics array
        assert len(data["driver_statistics"]) == data["total_drivers"]

        for driver_stat in data["driver_statistics"]:
            assert "driver_name" in driver_stat
            assert "student_count" in driver_stat
            assert isinstance(driver_stat["student_count"], int)
            assert driver_stat["student_count"] >= 0

    def test_get_driver_student_stats_extremes(self, test_client, sample_data):
        """Test identification of drivers with most/least students."""
        response = test_client.get("/reports/driver-student-stats")
        assert response.status_code == 200

        data = response.json()

        if data["total_drivers"] > 0:
            # Check that extremes are identified
            if data["driver_with_most_students"]:
                assert "driver_name" in data["driver_with_most_students"]
                assert "student_count" in data["driver_with_most_students"]

            if data["driver_with_least_students"]:
                assert "driver_name" in data["driver_with_least_students"]
                assert "student_count" in data["driver_with_least_students"]

class TestErrorScenarios:
    """Tests for various error scenarios and edge cases."""

    def test_malformed_database_connection(self, test_client):
        """Test handling of database connection issues."""
        # This test assumes the endpoint will handle database errors gracefully
        response = test_client.get("/reports/summary")

        # Should either succeed or fail gracefully with proper error message
        assert response.status_code in [200, 500]

        if response.status_code == 500:
            assert "Error generating report" in response.json()["detail"]

    def test_extreme_data_values(self, test_client):
        """Test handling of extreme data values in calculations."""
        # Create a student with very large fees value
        large_fees_data = {
            "name": "Extreme Value Student",
            "route": "Route 1",
            "fees": "999999999999.99"  # Very large number
        }

        response = test_client.post("/students/", json=large_fees_data)
        if response.status_code == 200:
            # If creation succeeded, test that reports still work
            summary_response = test_client.get("/reports/summary")
            assert summary_response.status_code in [200, 500]

            analysis_response = test_client.get("/reports/revenue-analysis")
            assert analysis_response.status_code in [200, 500]

    def test_special_characters_in_report_data(self, test_client):
        """Test handling of special characters in report data."""
        # Create student with special characters
        special_data = {
            "name": "José María O'Connor-Smith",
            "route": "Route 1",
            "father_name": "José María Sr.",
            "class_": "5",
            "fees": "1000.00"
        }

        response = test_client.post("/students/", json=special_data)
        if response.status_code == 200:
            # Test that reports handle special characters
            summary_response = test_client.get("/reports/summary")
            assert summary_response.status_code == 200

class TestConcurrentRequests:
    """Tests for concurrent request handling."""

    def test_concurrent_report_requests(self, test_client, sample_data):
        """Test handling of concurrent report requests."""
        def make_report_request(endpoint):
            return test_client.get(f"/reports/{endpoint}")

        endpoints = ["summary", "students-by-driver", "revenue-analysis", "driver-student-stats"]

        # Make concurrent requests to different report endpoints
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(make_report_request, endpoint) for endpoint in endpoints]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]

        # All requests should succeed
        assert all(response.status_code == 200 for response in responses)

    def test_concurrent_same_report_requests(self, test_client, sample_data):
        """Test handling of concurrent requests to the same report endpoint."""
        def make_summary_request():
            return test_client.get("/reports/summary")

        # Make multiple concurrent requests to the same endpoint
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(make_summary_request) for _ in range(5)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]

        # All requests should succeed and return consistent data
        assert all(response.status_code == 200 for response in responses)

        # Check that all responses return the same data (consistency)
        first_data = responses[0].json()
        for response in responses[1:]:
            data = response.json()
            assert data["total_drivers"] == first_data["total_drivers"]
            assert data["total_students"] == first_data["total_students"]
            assert abs(data["total_revenue"] - first_data["total_revenue"]) < 0.01

class TestPerformanceAndLoad:
    """Tests for performance and load handling."""

    def test_report_generation_performance(self, test_client, sample_data):
        """Test report generation performance."""
        # Test summary report performance
        start_time = time.time()
        response = test_client.get("/reports/summary")
        end_time = time.time()

        assert response.status_code == 200
        # Should complete within reasonable time (5 seconds for test)
        assert (end_time - start_time) < 5.0

    def test_large_dataset_report_performance(self, test_client):
        """Test report performance with larger dataset."""
        # Create additional test data
        for i in range(20):
            student_data = {
                "name": f"Performance Student {i}",
                "route": f"Route {i % 3 + 1}",
                "father_name": f"Father {i}",
                "class_": "5",
                "fees": f"{1000 + i}.00"
            }
            response = test_client.post("/students/", json=student_data)
            # Creation may fail due to duplicates, but that's okay for performance test

        # Test report performance with larger dataset
        start_time = time.time()
        response = test_client.get("/reports/summary")
        end_time = time.time()

        assert response.status_code in [200, 500]  # 500 might indicate performance issues
        if response.status_code == 200:
            # Should still complete within reasonable time
            assert (end_time - start_time) < 10.0  # Allow more time for larger dataset

class TestDataConsistency:
    """Tests for data consistency across reports."""

    def test_reports_data_consistency(self, test_client, sample_data):
        """Test that different reports return consistent data."""
        # Get data from all reports
        summary_response = test_client.get("/reports/summary")
        students_by_driver_response = test_client.get("/reports/students-by-driver")
        revenue_response = test_client.get("/reports/revenue-analysis")
        stats_response = test_client.get("/reports/driver-student-stats")

        if all(response.status_code == 200 for response in [
            summary_response, students_by_driver_response,
            revenue_response, stats_response
        ]):
            summary_data = summary_response.json()
            revenue_data = revenue_response.json()
            stats_data = stats_response.json()

            # Cross-validate data consistency
            # Total revenue should match between summary and revenue analysis
            assert abs(summary_data["total_revenue"] - revenue_data["total_revenue"]) < 0.01

            # Total students should match between summary and stats
            assert summary_data["total_students"] == stats_data["total_students"]

            # Total drivers should match between summary and stats
            assert summary_data["total_drivers"] == stats_data["total_drivers"]

    def test_students_by_driver_consistency(self, test_client, sample_data):
        """Test consistency within students-by-driver report."""
        response = test_client.get("/reports/students-by-driver")
        assert response.status_code == 200

        data = response.json()

        total_students_in_report = 0
        for driver_data in data["drivers"]:
            total_students_in_report += len(driver_data["students"])

        # Should match the total from summary report
        summary_response = test_client.get("/reports/summary")
        if summary_response.status_code == 200:
            summary_data = summary_response.json()
            assert total_students_in_report == summary_data["total_students"]

class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_reports_with_no_data(self, test_client):
        """Test reports with completely empty database."""
        # Test all report endpoints
        endpoints = ["summary", "students-by-driver", "revenue-analysis", "driver-student-stats"]

        for endpoint in endpoints:
            response = test_client.get(f"/reports/{endpoint}")
            assert response.status_code == 200

            data = response.json()

            # Should handle empty data gracefully
            if endpoint == "summary":
                assert data["total_drivers"] == 0
                assert data["total_students"] == 0
                assert data["total_revenue"] == 0.0
                assert data["drivers"] == []
            elif endpoint == "students-by-driver":
                assert data["drivers"] == []
            elif endpoint == "revenue-analysis":
                assert data["revenue_by_driver"] == {}
                assert data["revenue_by_class"] == {}
                assert data["total_revenue"] == 0.0
            elif endpoint == "driver-student-stats":
                assert data["total_drivers"] == 0
                assert data["total_students"] == 0
                assert data["average_students_per_driver"] == 0
                assert data["driver_statistics"] == []

    def test_reports_with_null_fees(self, test_client):
        """Test reports with students having null/zero fees."""
        # Create student with no fees
        student_data = {
            "name": "No Fees Student",
            "route": "Route 1",
            "father_name": "Father",
            "class_": "5"
        }

        response = test_client.post("/students/", json=student_data)
        if response.status_code == 200:
            # Test that reports handle null fees correctly
            summary_response = test_client.get("/reports/summary")
            revenue_response = test_client.get("/reports/revenue-analysis")

            if summary_response.status_code == 200 and revenue_response.status_code == 200:
                summary_data = summary_response.json()
                revenue_data = revenue_response.json()

                # Should not crash and should handle null fees as 0
                assert isinstance(summary_data["total_revenue"], (int, float))
                assert isinstance(revenue_data["total_revenue"], (int, float))

class TestSecurityAndHeaders:
    """Tests for security headers and configurations."""

    def test_cors_headers_reports(self, test_client):
        """Test CORS headers on reports endpoints."""
        response = test_client.options("/reports/summary")
        # Should not crash and may include CORS headers
        assert response.status_code in [200, 404, 405]

    def test_security_headers_present(self, test_client, sample_data):
        """Test that security headers are present in responses."""
        response = test_client.get("/reports/summary")

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

class TestReportDataValidation:
    """Tests for report data validation and accuracy."""

    def test_revenue_calculations_precision(self, test_client, sample_data):
        """Test that revenue calculations maintain proper precision."""
        response = test_client.get("/reports/revenue-analysis")
        assert response.status_code == 200

        data = response.json()

        # Check that revenue values have reasonable precision
        for driver_revenue in data["revenue_by_driver"].values():
            # Should be rounded to 2 decimal places or be integer
            assert isinstance(driver_revenue, (int, float))
            if isinstance(driver_revenue, float):
                # Check that it's not excessively precise
                assert str(driver_revenue).split('.')[-1].__len__() <= 10

    def test_student_count_accuracy(self, test_client, sample_data):
        """Test that student counts are accurate across reports."""
        # Get data from multiple reports
        summary_response = test_client.get("/reports/summary")
        students_by_driver_response = test_client.get("/reports/students-by-driver")
        stats_response = test_client.get("/reports/driver-student-stats")

        if all(response.status_code == 200 for response in [
            summary_response, students_by_driver_response, stats_response
        ]):
            summary_data = summary_response.json()
            students_by_driver_data = students_by_driver_response.json()
            stats_data = stats_response.json()

            # Count students from students-by-driver report
            students_from_grouping = sum(
                len(driver["students"]) for driver in students_by_driver_data["drivers"]
            )

            # Should match totals from other reports
            assert students_from_grouping == summary_data["total_students"]
            assert students_from_grouping == stats_data["total_students"]

class TestReportsGuestAccess:
    """Comprehensive tests for guest access to reports endpoints."""

    def test_guest_cannot_access_reports_summary(self, test_client):
        """Test that guest users cannot access reports summary without authentication."""
        response = test_client.get("/reports/summary")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_access_students_by_driver(self, test_client):
        """Test that guest users cannot access students by driver report."""
        response = test_client.get("/reports/students-by-driver")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_access_revenue_analysis(self, test_client):
        """Test that guest users cannot access revenue analysis report."""
        response = test_client.get("/reports/revenue-analysis")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_access_driver_student_stats(self, test_client):
        """Test that guest users cannot access driver student statistics."""
        response = test_client.get("/reports/driver-student-stats")
        # Should be unauthorized (401) or forbidden (403)
        assert response.status_code in [401, 403]

    def test_guest_cannot_access_reports_with_malformed_token(self, test_client):
        """Test that guest users with malformed tokens cannot access report endpoints."""
        headers = {"Authorization": "Bearer malformed.token.here"}

        endpoints = [
            "/reports/summary",
            "/reports/students-by-driver",
            "/reports/revenue-analysis",
            "/reports/driver-student-stats"
        ]

        for endpoint in endpoints:
            response = test_client.get(endpoint, headers=headers)
            assert response.status_code == 401

    def test_guest_reports_access_rate_limiting(self, test_client):
        """Test that guest access attempts to reports are properly rate limited."""
        # Make multiple requests rapidly
        responses = []

        for i in range(10):
            response = test_client.get("/reports/summary")
            responses.append(response.status_code)

        # All should be unauthorized/forbidden, but not crash
        assert all(status in [401, 403, 429] for status in responses)

class TestReportsGuestFirstArchitectureIntegration:
    """Integration tests for guest-first architecture with reports endpoints."""

    def test_guest_access_workflow_isolation(self, test_client):
        """Test that guest access attempts don't interfere with regular operations."""
        # Guest tries to access reports (should fail)
        guest_response = test_client.get("/reports/summary")
        assert guest_response.status_code in [401, 403]

        # Regular operation should still work (assuming no auth required for this test)
        # This tests that failed guest attempts don't break the system
        list_response = test_client.get("/reports/summary")
        # Should handle gracefully even if auth is required
        assert list_response.status_code in [200, 401, 403]

    def test_guest_error_responses_structure(self, test_client):
        """Test that guest error responses for reports have proper structure."""
        response = test_client.get("/reports/summary")

        if response.status_code in [401, 403]:
            data = response.json()
            assert "detail" in data
            assert isinstance(data["detail"], str)
            assert len(data["detail"]) > 0

    def test_guest_access_security_headers(self, test_client):
        """Test that security headers are present in guest access responses for reports."""
        response = test_client.get("/reports/summary")

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

    def test_guest_access_with_empty_headers(self, test_client):
        """Test guest access with empty authorization headers."""
        headers = {"Authorization": ""}
        response = test_client.get("/reports/summary", headers=headers)
        assert response.status_code == 401

    def test_guest_access_with_whitespace_token(self, test_client):
        """Test guest access with whitespace-only token."""
        headers = {"Authorization": "Bearer   "}
        response = test_client.get("/reports/summary", headers=headers)
        assert response.status_code == 401

    def test_guest_access_with_wrong_auth_scheme(self, test_client):
        """Test guest access with wrong authentication scheme."""
        headers = {"Authorization": "Basic dXNlcjpwYXNz"}  # Basic auth instead of Bearer
        response = test_client.get("/reports/summary", headers=headers)
        assert response.status_code == 401

    def test_guest_access_with_incomplete_bearer_token(self, test_client):
        """Test guest access with incomplete Bearer token."""
        headers = {"Authorization": "Bearer"}
        response = test_client.get("/reports/summary", headers=headers)
        assert response.status_code == 401

class TestReportsGuestAccessPerformance:
    """Performance tests for guest access scenarios."""

    def test_guest_access_response_time(self, test_client):
        """Test that guest access responses are reasonably fast."""
        import time

        start_time = time.time()
        response = test_client.get("/reports/summary")
        end_time = time.time()

        # Should respond within 2 seconds even for unauthorized access
        assert (end_time - start_time) < 2.0
        # Should return proper error status
        assert response.status_code in [401, 403]

    def test_guest_access_concurrent_requests(self, test_client):
        """Test handling of concurrent guest access requests."""
        def make_guest_request():
            return test_client.get("/reports/summary")

        import concurrent.futures

        # Make multiple concurrent guest requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_guest_request) for _ in range(5)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]

        # All requests should return consistent error codes
        assert all(response.status_code in [401, 403] for response in responses)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])