"""
Integration tests for backend services.

This module tests the integration between services, database operations,
and business logic to ensure end-to-end functionality.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from backend.services.student_service import StudentService
from backend.services.driver_service import DriverService
from backend.services.report_service import ReportService
from backend.services.chart_service import ChartService
from backend.models import CreateStudentRequest, CreateDriverRequest, UpdateStudentRequest

@pytest.fixture
async def sample_integration_data(test_db: AsyncSession):
    """Create comprehensive sample data for integration testing."""
    # Create drivers
    drivers_data = [
        CreateDriverRequest(
            name="Integration Driver A",
            route="Route A",
            vehicle_number="INT001",
            contact_number="1111111111",
            license_number="LICINT001",
            experience_years=5
        ),
        CreateDriverRequest(
            name="Integration Driver B",
            route="Route B",
            vehicle_number="INT002",
            contact_number="2222222222",
            license_number="LICINT002",
            experience_years=3
        )
    ]

    created_drivers = []
    for driver_data in drivers_data:
        driver = await DriverService.create_driver(test_db, driver_data)
        created_drivers.append(driver)

    # Create students
    students_data = [
        CreateStudentRequest(
            name="Integration Student 1",
            father_name="Father 1",
            class_="10",
            mobile="1000000001",
            route="Route A",
            fees=1000.0,
            address="Address 1"
        ),
        CreateStudentRequest(
            name="Integration Student 2",
            father_name="Father 2",
            class_="9",
            mobile="1000000002",
            route="Route A",
            fees=1200.0,
            address="Address 2"
        ),
        CreateStudentRequest(
            name="Integration Student 3",
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
        student = await StudentService.create_student(test_db, student_data)
        created_students.append(student)

    return {
        "drivers": created_drivers,
        "students": created_students
    }

class TestServicesIntegration:
    """Integration tests for service layer interactions."""

    @pytest.mark.asyncio
    async def test_student_driver_relationship_integrity(self, test_db: AsyncSession, sample_integration_data):
        """Test that student-driver relationships are maintained correctly."""
        students = sample_integration_data["students"]
        drivers = sample_integration_data["drivers"]

        # Verify students are created with correct routes
        for student in students:
            assert student.route in ["Route A", "Route B"]

        # Verify drivers have associated students
        driver_a_info = await DriverService.get_driver_info(test_db, "Integration Driver A")
        driver_b_info = await DriverService.get_driver_info(test_db, "Integration Driver B")

        assert driver_a_info.total_students >= 2  # Students on Route A
        assert driver_b_info.total_students >= 1  # Students on Route B

    @pytest.mark.asyncio
    async def test_report_service_uses_correct_data(self, test_db: AsyncSession, sample_integration_data):
        """Test that report service aggregates data correctly."""
        # Get summary report
        summary = await ReportService.get_reports_summary(test_db)

        # Verify totals match our sample data
        assert summary["total_students"] >= 3
        assert summary["total_drivers"] >= 2

        # Calculate expected revenue
        expected_revenue = sum(student.fees for student in sample_integration_data["students"])
        assert summary["total_revenue"] == expected_revenue

    @pytest.mark.asyncio
    async def test_chart_service_data_consistency(self, test_db: AsyncSession, sample_integration_data):
        """Test that chart service provides consistent data."""
        # Get different chart data
        distribution = await ChartService.get_student_distribution_chart_data(test_db)
        revenue_by_driver = await ChartService.get_revenue_by_driver_chart_data(test_db)
        revenue_by_class = await ChartService.get_revenue_by_class_chart_data(test_db)

        # Verify labels are consistent
        dist_routes = set(distribution["labels"])
        revenue_routes = set(revenue_by_driver["labels"])
        assert dist_routes == revenue_routes

        # Verify total students matches
        total_from_distribution = sum(distribution["values"])
        assert total_from_distribution == len(sample_integration_data["students"])

        # Verify total revenue matches across services
        revenue_from_driver_chart = sum(revenue_by_driver["values"])
        revenue_from_class_chart = sum(revenue_by_class["values"])
        assert revenue_from_driver_chart == revenue_from_class_chart

    @pytest.mark.asyncio
    async def test_crud_operations_integration(self, test_db: AsyncSession):
        """Test complete CRUD cycle integration."""
        # Create student
        student_data = CreateStudentRequest(
            name="CRUD Test Student",
            father_name="CRUD Father",
            class_="8",
            mobile="9999999999",
            route="Test Route",
            fees=950.0,
            address="Test Address"
        )
        created_student = await StudentService.create_student(test_db, student_data)
        assert created_student.name == "CRUD Test Student"

        # Read student
        retrieved_student = await StudentService.get_student_by_id(test_db, int(created_student.id))
        assert retrieved_student.name == "CRUD Test Student"

        # Update student
        update_data = UpdateStudentRequest(name="Updated CRUD Student", class_="9")
        updated_student = await StudentService.update_student(test_db, int(created_student.id), update_data)
        assert updated_student.name == "Updated CRUD Student"
        assert updated_student.class_ == "9"

        # Delete student
        result = await StudentService.delete_student(test_db, int(created_student.id))
        assert "deleted successfully" in result["message"]

        # Verify deletion
        with pytest.raises(Exception):  # Should raise 404
            await StudentService.get_student_by_id(test_db, int(created_student.id))

    @pytest.mark.asyncio
    async def test_search_integration(self, test_db: AsyncSession, sample_integration_data):
        """Test search functionality integration."""
        # Search by name
        results = await StudentService.search_students(test_db, "Integration Student")
        assert len(results.students) >= 3

        # Search by father name
        results = await StudentService.search_students(test_db, "Father 1")
        assert len(results.students) >= 1
        assert results.students[0].father_name == "Father 1"

        # Search by class
        results = await StudentService.search_students(test_db, "10")
        assert len(results.students) >= 2  # Students in class 10

    @pytest.mark.asyncio
    async def test_driver_student_count_consistency(self, test_db: AsyncSession, sample_integration_data):
        """Test that driver student counts are accurate."""
        # Get students by driver report
        students_by_driver = await ReportService.get_students_by_driver(test_db)

        # Manually count students per route
        manual_counts = {}
        for student in sample_integration_data["students"]:
            route = student.route
            manual_counts[route] = manual_counts.get(route, 0) + 1

        # Compare with report data
        for route, students in students_by_driver.items():
            if route in manual_counts:
                assert len(students) == manual_counts[route]

    @pytest.mark.asyncio
    async def test_data_validation_integration(self, test_db: AsyncSession):
        """Test data validation across services."""
        # Test duplicate mobile validation
        student1_data = CreateStudentRequest(
            name="Student 1",
            father_name="Father 1",
            class_="10",
            mobile="1111111111",
            route="Route 1",
            fees=1000.0,
            address="Address 1"
        )

        student2_data = CreateStudentRequest(
            name="Student 2",
            father_name="Father 2",
            class_="9",
            mobile="1111111111",  # Same mobile
            route="Route 2",
            fees=1200.0,
            address="Address 2"
        )

        await StudentService.create_student(test_db, student1_data)

        # Second student with same mobile should fail
        with pytest.raises(Exception):
            await StudentService.create_student(test_db, student2_data)

    @pytest.mark.asyncio
    async def test_bulk_operations_simulation(self, test_db: AsyncSession):
        """Test bulk operations to ensure service stability."""
        # Create multiple students rapidly
        students_data = []
        for i in range(10):
            student_data = CreateStudentRequest(
                name=f"Bulk Student {i}",
                father_name=f"Father {i}",
                class_="10",
                mobile=f"20000000{i:02d}",
                route="Bulk Route",
                fees=1000.0 + i * 50,
                address=f"Address {i}"
            )
            students_data.append(student_data)

        created_students = []
        for student_data in students_data:
            student = await StudentService.create_student(test_db, student_data)
            created_students.append(student)

        # Verify all were created
        assert len(created_students) == 10

        # Test bulk retrieval
        all_students = await StudentService.get_students(test_db, skip=0, limit=50)
        bulk_students = [s for s in all_students.students if s.route == "Bulk Route"]
        assert len(bulk_students) == 10

    @pytest.mark.asyncio
    async def test_service_error_handling(self, test_db: AsyncSession):
        """Test error handling across services."""
        # Test invalid student ID
        with pytest.raises(Exception):
            await StudentService.get_student_by_id(test_db, 99999)

        # Test invalid driver name
        with pytest.raises(Exception):
            await DriverService.get_driver_info(test_db, "NonExistentDriver")

    @pytest.mark.asyncio
    async def test_transaction_integrity(self, test_db: AsyncSession):
        """Test that operations maintain transaction integrity."""
        # Create a student
        student_data = CreateStudentRequest(
            name="Transaction Test Student",
            father_name="Transaction Father",
            class_="10",
            mobile="5173000000",
            route="Transaction Route",
            fees=1000.0,
            address="Transaction Address"
        )

        created_student = await StudentService.create_student(test_db, student_data)

        # Verify it exists immediately
        retrieved = await StudentService.get_student_by_id(test_db, int(created_student.id))
        assert retrieved.name == "Transaction Test Student"

        # Update and verify
        update_data = UpdateStudentRequest(name="Updated Transaction Student")
        updated = await StudentService.update_student(test_db, int(created_student.id), update_data)
        assert updated.name == "Updated Transaction Student"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])