"""
Student CRUD E2E Tests
Tests Create, Read, Update, Delete operations for students
"""

import pytest
import time
import requests
from typing import Dict, List, Any

from e2e_tests.base.base_test import BaseE2ETest
from e2e_tests.helpers.api_helpers import APIClient, create_test_student, delete_test_student
from e2e_tests.helpers.assertion_helpers import (
    assert_response_status, assert_response_success, assert_json_response,
    assert_student_data_structure, assert_data_consistency, assert_element_visible,
    assert_text_in_element, assert_table_row_count
)
from e2e_tests.helpers.logging_helpers import log_test_step
from e2e_tests.config.test_config import get_config


class TestStudentCRUD(BaseE2ETest):
    """Test comprehensive CRUD operations for students"""

    def test_create_student_e2e(self):
        """Test creating a new student through the UI and API"""
        test_name = "create_student_e2e"

        with self.measure_performance(f"{test_name}_setup"):
            # Login as authenticated user
            login_data = self.login_as_dev_user()
            self.test_logger.log_api_call("POST", "/api/auth/login", 200)

        with self.measure_performance(f"{test_name}_create_student"):
            # Create test student data
            student_data = {
                "name": f"E2E_Create_Test_{int(time.time())}",
                "father_name": "Test Father",
                "class": "5",
                "mobile": "1234567890",
                "route": "TEST_CREATE",
                "address": "Test Address for Creation",
                "fees": "1000"
            }

            # Create student via API
            response = self.api_client.post("/api/students/", student_data)
            assert_response_success(response, "create student")
            assert_response_status(response, 200, "create student")

            created_student = assert_json_response(response, "create student")
            assert_student_data_structure(created_student, ["id", "name", "father_name", "class"])

            # Register for cleanup
            self.created_students.append(created_student)

        with self.measure_performance(f"{test_name}_verify_creation"):
            # Verify student was created correctly
            assert created_student["name"] == student_data["name"]
            assert created_student["father_name"] == student_data["father_name"]
            assert created_student["class"] == student_data["class"]

            # Verify via API that student exists
            get_response = self.api_client.get(f"/api/students/{created_student['id']}/")
            assert_response_success(get_response, "get created student")

            retrieved_student = assert_json_response(get_response, "get created student")
            assert_data_consistency(retrieved_student, student_data, "student creation verification")

        log_test_step(self.test_logger, "Student created successfully", {
            'student_id': created_student['id'],
            'student_name': created_student['name']
        })

    def test_read_students_e2e(self):
        """Test reading/displaying students in the UI and API"""
        test_name = "read_students_e2e"

        with self.measure_performance(f"{test_name}_setup"):
            # Create multiple test students for reading
            test_students = self.create_multiple_test_students(3)
            student_ids = [student['id'] for student in test_students]

        with self.measure_performance(f"{test_name}_read_students"):
            # Test reading all students
            response = self.api_client.get("/api/students/")
            assert_response_success(response, "read all students")

            students_data = assert_json_response(response, "read all students")
            assert "students" in students_data
            assert "total_count" in students_data
            assert len(students_data["students"]) >= len(test_students)

            # Verify our test students are included
            returned_ids = {student["id"] for student in students_data["students"]}
            for student_id in student_ids:
                assert student_id in returned_ids, f"Test student {student_id} not found in results"

        with self.measure_performance(f"{test_name}_read_individual"):
            # Test reading individual students
            for student in test_students:
                response = self.api_client.get(f"/api/students/{student['id']}/")
                assert_response_success(response, f"read individual student {student['id']}")

                individual_student = assert_json_response(response, f"read student {student['id']}")
                assert_student_data_structure(individual_student)

                # Verify data consistency
                assert_data_consistency(individual_student, student, f"individual student read for {student['id']}")

        log_test_step(self.test_logger, "Students read successfully", {
            'total_students': len(students_data["students"]),
            'test_students_found': len(student_ids)
        })

    def test_update_student_e2e(self):
        """Test updating a student through the UI and API"""
        test_name = "update_student_e2e"

        with self.measure_performance(f"{test_name}_setup"):
            # Create a test student to update
            student = self.create_test_student()
            student_id = student['id']

        with self.measure_performance(f"{test_name}_update_student"):
            # Update student data
            update_data = {
                "name": f"Updated_{student['name']}",
                "father_name": "Updated Father",
                "class": "6",
                "fees": "1500"
            }

            # Update via API
            response = self.api_client.put(f"/api/students/{student_id}/", update_data)
            assert_response_success(response, "update student")
            assert_response_status(response, 200, "update student")

            updated_student = assert_json_response(response, "update student")
            assert_student_data_structure(updated_student)

        with self.measure_performance(f"{test_name}_verify_update"):
            # Verify the update
            assert updated_student["name"] == update_data["name"]
            assert updated_student["father_name"] == update_data["father_name"]
            assert updated_student["class"] == update_data["class"]
            assert updated_student["fees"] == update_data["fees"]

            # Verify unchanged fields remain the same
            assert updated_student["mobile"] == student["mobile"]
            assert updated_student["route"] == student["route"]

            # Verify via separate GET request
            get_response = self.api_client.get(f"/api/students/{student_id}/")
            assert_response_success(get_response, "verify updated student")

            verified_student = assert_json_response(get_response, "verify updated student")
            assert_data_consistency(verified_student, updated_student, "student update verification")

        log_test_step(self.test_logger, "Student updated successfully", {
            'student_id': student_id,
            'old_name': student['name'],
            'new_name': updated_student['name']
        })

    def test_delete_student_e2e(self):
        """Test deleting a student through the UI and API"""
        test_name = "delete_student_e2e"

        with self.measure_performance(f"{test_name}_setup"):
            # Create a test student to delete
            student = self.create_test_student()
            student_id = student['id']

            # Verify student exists before deletion
            get_response = self.api_client.get(f"/api/students/{student_id}/")
            assert_response_success(get_response, "verify student exists before deletion")

        with self.measure_performance(f"{test_name}_delete_student"):
            # Delete via API
            response = self.api_client.delete(f"/api/students/{student_id}/")
            assert_response_success(response, "delete student")
            assert_response_status(response, 200, "delete student")

            delete_result = assert_json_response(response, "delete student")
            assert "message" in delete_result or delete_result.get("success", False)

        with self.measure_performance(f"{test_name}_verify_deletion"):
            # Verify student is deleted
            get_response = self.api_client.get(f"/api/students/{student_id}/")
            assert_response_status(get_response, 404, "verify student deletion")

            # Verify student is not in the list
            list_response = self.api_client.get("/api/students/")
            assert_response_success(list_response, "get students list after deletion")

            all_students = assert_json_response(list_response, "get students list after deletion")
            returned_ids = {student["id"] for student in all_students["students"]}
            assert student_id not in returned_ids, "Deleted student still appears in list"

        log_test_step(self.test_logger, "Student deleted successfully", {
            'deleted_student_id': student_id,
            'remaining_students': len(all_students["students"])
        })

    def test_bulk_student_operations(self):
        """Test bulk operations on students"""
        test_name = "bulk_student_operations"

        with self.measure_performance(f"{test_name}_create_bulk"):
            # Create multiple students for bulk testing
            students_data = [
                {
                    "name": f"Bulk_Test_Student_{i+1}",
                    "father_name": f"Bulk_Father_{i+1}",
                    "class": str((i % 5) + 1),  # Classes 1-5
                    "mobile": f"111111111{i}",
                    "route": f"BULK_ROUTE_{i+1}",
                    "address": f"Bulk Address {i+1}",
                    "fees": str(1000 + i * 100)
                }
                for i in range(5)
            ]

            created_students = []
            for student_data in students_data:
                response = self.api_client.post("/api/students/", student_data)
                assert_response_success(response, f"create bulk student {student_data['name']}")

                student = assert_json_response(response, f"create bulk student {student_data['name']}")
                created_students.append(student)
                self.created_students.append(student)

        with self.measure_performance(f"{test_name}_verify_bulk"):
            # Verify all students were created
            assert len(created_students) == 5

            # Verify students list reflects all creations
            response = self.api_client.get("/api/students/")
            assert_response_success(response, "get students after bulk creation")

            all_students = assert_json_response(response, "get students after bulk creation")
            assert all_students["total_count"] >= 5

            # Verify each student can be retrieved individually
            for student in created_students:
                get_response = self.api_client.get(f"/api/students/{student['id']}/")
                assert_response_success(get_response, f"get bulk student {student['id']}")

        with self.measure_performance(f"{test_name}_cleanup_bulk"):
            # Cleanup - delete all created students
            for student in created_students:
                delete_response = self.api_client.delete(f"/api/students/{student['id']}/")
                assert_response_success(delete_response, f"cleanup bulk student {student['id']}")

        log_test_step(self.test_logger, "Bulk operations completed successfully", {
            'students_created': len(created_students),
            'students_deleted': len(created_students)
        })

    def test_student_data_validation(self):
        """Test student data validation and error handling"""
        test_name = "student_data_validation"

        # Test invalid data scenarios
        invalid_data_scenarios = [
            # Missing required fields
            {},
            {"name": "Test"},
            # Invalid data types
            {"name": 123, "father_name": "Father"},
            {"name": "Test", "class": -1},
            {"name": "Test", "mobile": "invalid"},
            # Too long values
            {"name": "A" * 1000, "father_name": "Father"},
        ]

        for i, invalid_data in enumerate(invalid_data_scenarios):
            with self.measure_performance(f"{test_name}_invalid_scenario_{i}"):
                response = self.api_client.post("/api/students/", invalid_data)

                # Should return validation error
                assert response.status_code in [400, 422], \
                    f"Expected validation error for scenario {i}, got {response.status_code}"

                error_data = assert_json_response(response, f"validation error scenario {i}")

                # Should contain error details
                assert "detail" in error_data or "error" in error_data or "message" in error_data

        # Test valid data still works
        valid_student = {
            "name": "Validation_Test_Student",
            "father_name": "Validation_Father",
            "class": "8",
            "mobile": "9999999999",
            "route": "VALIDATION_ROUTE",
            "address": "Validation Address",
            "fees": "2000"
        }

        response = self.api_client.post("/api/students/", valid_student)
        assert_response_success(response, "create valid student after validation tests")

        valid_created = assert_json_response(response, "create valid student after validation tests")
        self.created_students.append(valid_created)

        log_test_step(self.test_logger, "Data validation tests completed", {
            'invalid_scenarios_tested': len(invalid_data_scenarios),
            'valid_student_created': True
        })

    def test_student_crud_performance(self):
        """Test performance of CRUD operations"""
        test_name = "student_crud_performance"

        # Test creation performance
        with self.measure_performance(f"{test_name}_create_performance"):
            start_time = time.time()
            students = []
            for i in range(10):
                student_data = {
                    "name": f"Perf_Test_Student_{i}",
                    "father_name": "Perf_Father",
                    "class": "5",
                    "mobile": f"5555555{i:02d}",
                    "route": "PERF_ROUTE",
                    "address": f"Performance Test Address {i}",
                    "fees": "1000"
                }

                response = self.api_client.post("/api/students/", student_data)
                assert_response_success(response, f"create performance test student {i}")
                students.append(assert_json_response(response, f"create performance test student {i}"))

            create_duration = time.time() - start_time
            self.test_logger.log_performance_warning(
                f"Creating {len(students)} students", create_duration, 5.0
            )

        # Test read performance
        with self.measure_performance(f"{test_name}_read_performance"):
            start_time = time.time()

            # Read all students
            response = self.api_client.get("/api/students/")
            assert_response_success(response, "read all students for performance test")

            # Read individual students
            for student in students:
                get_response = self.api_client.get(f"/api/students/{student['id']}/")
                assert_response_success(get_response, f"read individual student {student['id']}")

            read_duration = time.time() - start_time
            self.test_logger.log_performance_warning(
                f"Reading {len(students)} students", read_duration, 3.0
            )

        # Cleanup
        for student in students:
            self.api_client.delete(f"/api/students/{student['id']}/")

        log_test_step(self.test_logger, "Performance tests completed", {
            'students_created': len(students),
            'create_duration': create_duration,
            'read_duration': read_duration
        })


# Pytest integration
@pytest.mark.integration
@pytest.mark.api
class TestStudentCRUDPytest:
    """Pytest-compatible student CRUD tests"""

    @pytest.fixture
    def crud_test_base(self):
        """Provide configured test base for pytest"""
        return BaseE2ETest()

    def test_create_student_pytest(self, crud_test_base):
        """Pytest version of create student test"""
        crud_test_base.setup_method(self.test_create_student_pytest)

        try:
            # Simplified test logic
            student = crud_test_base.create_test_student()
            assert student['id'] is not None
            assert student['name'] is not None

        finally:
            crud_test_base.teardown_method(self.test_create_student_pytest)

    def test_read_students_pytest(self, crud_test_base):
        """Pytest version of read students test"""
        crud_test_base.setup_method(self.test_read_students_pytest)

        try:
            # Create test students
            students = crud_test_base.create_multiple_test_students(2)

            # Verify they can be read
            response = crud_test_base.api_client.get("/api/students/")
            assert response.status_code == 200

            students_data = response.json()
            assert len(students_data["students"]) >= 2

        finally:
            crud_test_base.teardown_method(self.test_read_students_pytest)