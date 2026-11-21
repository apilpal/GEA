"""
Comprehensive Integration Testing Documentation and Examples

This module provides documentation, examples, and best practices for
comprehensive integration testing of the Student Profiles API.

Testing Categories Covered:
==========================

1. Authentication Workflow Integration
2. CRUD Operations Integration
3. Data Flow Integration (CSV Sync, Reports, Charts)
4. Error Scenarios and Edge Cases
5. End-to-End User Journeys
6. Cross-Service Integration
7. Database Transaction Testing
8. Performance and Load Testing

TESTING FRAMEWORK OVERVIEW
==========================

The integration test framework provides:
- Comprehensive test data setup and cleanup
- Authentication state management across tests
- Database transaction handling
- Performance measurement and validation
- Error scenario simulation
- Cross-service dependency testing

BASIC TEST STRUCTURE
===================

```python
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

class TestFeatureIntegration:
    \"\"\"Test class for specific feature integration.\"\"\"

    @pytest.mark.asyncio
    async def test_complete_workflow(self, async_client, test_db):
        \"\"\"Test complete workflow from start to finish.\"\"\"
        # 1. Setup - Authenticate user
        login_data = {"username_or_email": "admin@test.com", "password": "adminpass123"}
        response = await async_client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200

        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Execute - Perform operations
        test_data = {"name": "Test Student", "mobile": "9876543210"}
        response = await async_client.post("/api/students/", json=test_data, headers=headers)
        assert response.status_code == 200

        # 3. Verify - Check results
        student_id = response.json()["id"]
        response = await async_client.get(f"/api/students/{student_id}", headers=headers)
        assert response.status_code == 200

        # 4. Cleanup - Remove test data
        await async_client.delete(f"/api/students/{student_id}", headers=headers)
```

AUTHENTICATION INTEGRATION TESTS
===============================

Testing authentication workflows across the application:

```python
@pytest.mark.asyncio
async def test_guest_to_registered_workflow(self, async_client, test_db):
    \"\"\"Test complete guest user to registered user conversion.\"\"\"
    # Phase 1: Create guest user
    response = await async_client.post("/api/auth/guest")
    guest_data = response.json()
    guest_token = guest_data["access_token"]
    guest_headers = {"Authorization": f"Bearer {guest_token}"}

    # Phase 2: Explore as guest
    response = await async_client.get("/api/auth/guest/dashboard", headers=guest_headers)
    assert response.status_code == 200

    # Phase 3: Convert to registered user
    conversion_data = {
        "guest_id": guest_data["guest_id"],
        "username": "new_user",
        "email": "new@example.com",
        "password": "password123"
    }
    response = await async_client.post("/api/auth/convert-guest",
                                     json=conversion_data,
                                     headers=guest_headers)
    assert response.status_code == 200

    # Phase 4: Verify registered user access
    login_data = {"username_or_email": "new@example.com", "password": "password123"}
    response = await async_client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
```

CRUD OPERATIONS INTEGRATION TESTS
=================================

Testing Create, Read, Update, Delete operations:

```python
@pytest.mark.asyncio
async def test_student_crud_workflow(self, async_client, test_db):
    \"\"\"Test complete CRUD workflow for students.\"\"\"
    # Authenticate
    login_response = await self.authenticate_admin(async_client)
    headers = {"Authorization": f"Bearer {login_response['access_token']}"}

    # CREATE
    student_data = {
        "name": "Test Student",
        "father_name": "Test Father",
        "class_name": "10A",
        "mobile": "9876543210",
        "address": "Test Address",
        "route": "Route 1"
    }
    response = await async_client.post("/api/students/",
                                     json=student_data,
                                     headers=headers)
    assert response.status_code == 200
    student_id = response.json()["id"]

    # READ (list)
    response = await async_client.get("/api/students/", headers=headers)
    assert response.status_code == 200
    students = response.json()["students"]
    assert any(s["id"] == student_id for s in students)

    # READ (single)
    response = await async_client.get(f"/api/students/{student_id}", headers=headers)
    assert response.status_code == 200
    student = response.json()
    assert student["name"] == "Test Student"

    # UPDATE
    update_data = {"class_name": "10B", "address": "Updated Address"}
    response = await async_client.put(f"/api/students/{student_id}",
                                    json=update_data,
                                    headers=headers)
    assert response.status_code == 200
    updated_student = response.json()
    assert updated_student["class_name"] == "10B"

    # DELETE
    response = await async_client.delete(f"/api/students/{student_id}", headers=headers)
    assert response.status_code == 200

    # Verify deletion
    response = await async_client.get(f"/api/students/{student_id}", headers=headers)
    assert response.status_code == 404
```

DATA FLOW INTEGRATION TESTS
===========================

Testing data flow between services:

```python
@pytest.mark.asyncio
async def test_csv_sync_data_flow(self, async_client, test_db):
    \"\"\"Test CSV sync service integration.\"\"\"
    # Authenticate
    headers = await self.get_admin_headers(async_client)

    # Get initial state
    response = await async_client.get("/api/drivers/", headers=headers)
    initial_count = response.json()["total"]

    # Mock CSV sync
    with patch('services.csv_sync_service.sync_all_drivers') as mock_sync:
        mock_sync.return_value = {
            "success": True,
            "drivers_created": 2,
            "drivers_updated": 0,
            "errors": []
        }

        response = await async_client.post("/api/csv-sync/sync", headers=headers)
        assert response.status_code == 200

    # Verify data flow to API
    response = await async_client.get("/api/drivers/", headers=headers)
    assert response.status_code == 200

    # Test integration with reports
    response = await async_client.get("/api/reports/summary", headers=headers)
    assert response.status_code == 200
```

ERROR SCENARIO TESTS
===================

Testing error handling and edge cases:

```python
@pytest.mark.asyncio
async def test_rate_limiting_integration(self, async_client, test_db):
    \"\"\"Test rate limiting across endpoints.\"\"\"
    # Test without authentication (should be rate limited)
    for i in range(70):  # Exceed 60/minute limit
        response = await async_client.get("/api/health")
        if i < 60:
            assert response.status_code == 200
        else:
            assert response.status_code == 429

@pytest.mark.asyncio
async def test_database_rollback_integration(self, async_client, test_db):
    \"\"\"Test database transaction rollback.\"\"\"
    headers = await self.get_admin_headers(async_client)

    # Get initial count
    response = await async_client.get("/api/students/", headers=headers)
    initial_count = response.json()["total"]

    # Try invalid operation (should rollback)
    invalid_data = {
        "name": "",  # Invalid empty name
        "mobile": "9876543210"
    }
    response = await async_client.post("/api/students/",
                                     json=invalid_data,
                                     headers=headers)
    assert response.status_code == 422

    # Verify rollback
    response = await async_client.get("/api/students/", headers=headers)
    final_count = response.json()["total"]
    assert initial_count == final_count
```

PERFORMANCE AND LOAD TESTS
=========================

Testing performance under load:

```python
@pytest.mark.asyncio
async def test_bulk_operations_performance(self, async_client, test_db):
    \"\"\"Test performance of bulk operations.\"\"\"
    headers = await self.get_admin_headers(async_client)

    # Test bulk creation performance
    start_time = time.time()
    students_to_create = 100

    for i in range(students_to_create):
        student_data = {
            "name": f"Bulk Student {i}",
            "mobile": f"9876543{i:03d}"
        }
        response = await async_client.post("/api/students/",
                                         json=student_data,
                                         headers=headers)
        assert response.status_code == 200

    duration = time.time() - start_time
    assert duration < 30  # Should complete within 30 seconds

@pytest.mark.asyncio
async def test_concurrent_sessions_performance(self, async_client, test_db):
    \"\"\"Test performance with concurrent sessions.\"\"\"
    import asyncio

    async def simulate_user_session(session_id: int):
        # Login
        login_data = {"username_or_email": "admin@test.com", "password": "adminpass123"}
        response = await async_client.post("/api/auth/login", json=login_data)
        if response.status_code != 200:
            return False

        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Perform operations
        operations = []
        response = await async_client.get("/api/students/", headers=headers)
        operations.append(response.status_code == 200)

        response = await async_client.get("/api/health", headers=headers)
        operations.append(response.status_code == 200)

        return all(operations)

    # Run concurrent sessions
    start_time = time.time()
    tasks = [simulate_user_session(i) for i in range(20)]
    results = await asyncio.gather(*tasks)

    duration = time.time() - start_time
    assert duration < 60  # 60 seconds for 20 concurrent sessions

    success_rate = sum(results) / len(results)
    assert success_rate >= 0.8  # At least 80% success rate
```

TEST DATA MANAGEMENT
===================

Managing test data effectively:

```python
class TestDataManager:
    \"\"\"Helper class for managing test data.\"\"\"

    def __init__(self):
        self.created_students = []
        self.created_drivers = []
        self.created_users = []

    async def create_test_student(self, async_client, headers, **overrides):
        \"\"\"Create a test student with cleanup tracking.\"\"\"
        default_data = {
            "name": "Test Student",
            "father_name": "Test Father",
            "class_name": "10A",
            "mobile": f"9876543{random.randint(100, 999)}",
            "address": "Test Address",
            "route": "Route 1"
        }
        student_data = {**default_data, **overrides}

        response = await async_client.post("/api/students/",
                                         json=student_data,
                                         headers=headers)
        if response.status_code == 200:
            student = response.json()
            self.created_students.append(student["id"])
            return student
        return None

    async def cleanup_all(self, async_client, headers):
        \"\"\"Clean up all created test data.\"\"\"
        for student_id in self.created_students:
            await async_client.delete(f"/api/students/{student_id}", headers=headers)
        for driver_id in self.created_drivers:
            await async_client.delete(f"/api/drivers/{driver_id}", headers=headers)
        for user_id in self.created_users:
            await async_client.delete(f"/api/users/{user_id}", headers=headers)

        self.created_students.clear()
        self.created_drivers.clear()
        self.created_users.clear()
```

MOCKING EXTERNAL DEPENDENCIES
============================

Testing with external service mocks:

```python
@pytest.mark.asyncio
async def test_ai_service_integration(self, async_client, test_db):
    \"\"\"Test AI service integration with mocking.\"\"\"
    headers = await self.get_admin_headers(async_client)

    # Mock AI service response
    with patch('services.ai_chat_service.AIService.generate_response') as mock_ai:
        mock_ai.return_value = "This is a mocked AI response for testing"

        chat_data = {
            "message": "Test message",
            "context": "test_context"
        }

        response = await async_client.post("/api/chat",
                                         json=chat_data,
                                         headers=headers)
        assert response.status_code == 200

        response_data = response.json()
        assert response_data["response"] == "This is a mocked AI response for testing"

@pytest.mark.asyncio
async def test_csv_sync_integration(self, async_client, test_db):
    \"\"\"Test CSV sync with file mocking.\"\"\"
    headers = await self.get_admin_headers(async_client)

    # Mock file reading
    test_csv_content = \"\"\"name,license_number,vehicle_number,mobile,experience_years
Test Driver,DL123456789,TEST123,9876543210,5
\"\"\"

    with patch('builtins.open', mock_open(read_data=test_csv_content)):
        with patch('services.csv_sync_service.sync_all_drivers') as mock_sync:
            mock_sync.return_value = {
                "success": True,
                "drivers_created": 1,
                "errors": []
            }

            response = await async_client.post("/api/csv-sync/sync", headers=headers)
            assert response.status_code == 200
```

TEST ORGANIZATION BEST PRACTICES
===============================

1. **Test Structure**:
   - Group related tests in classes
   - Use descriptive test method names
   - Follow arrange-act-assert pattern

2. **Data Management**:
   - Create minimal test data needed for each test
   - Clean up test data in fixtures or tearDown methods
   - Use unique identifiers to avoid conflicts

3. **Authentication**:
   - Create helper methods for authentication
   - Test with different user roles
   - Verify proper access control

4. **Error Testing**:
   - Test both success and failure scenarios
   - Verify proper error responses
   - Test rate limiting and security features

5. **Performance Testing**:
   - Set realistic performance expectations
   - Test with appropriate data volumes
   - Monitor resource usage

RUNNING INTEGRATION TESTS
========================

```bash
# Run all integration tests
pytest backend/test_integration_comprehensive.py -v

# Run specific test category
pytest backend/test_integration_comprehensive.py::TestAuthenticationWorkflowIntegration -v

# Run with coverage
pytest backend/test_integration_comprehensive.py --cov=src --cov-report=html

# Run performance tests only
pytest backend/test_integration_comprehensive.py::TestPerformanceAndLoadIntegration -v

# Run with custom database
DATABASE_URL=postgresql://user:pass@localhost/test_db pytest backend/test_integration_comprehensive.py
```

TEST ENVIRONMENT SETUP
=====================

1. **Database**:
   - Use in-memory SQLite for fast tests
   - Use PostgreSQL for realistic testing
   - Ensure proper schema setup

2. **External Services**:
   - Mock AI services for consistent responses
   - Mock file I/O operations
   - Mock external API calls

3. **Configuration**:
   - Use test-specific configuration
   - Disable rate limiting for tests where needed
   - Set appropriate timeouts

DEBUGGING INTEGRATION TESTS
===========================

```python
import logging

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)

# Add debug prints in tests
def test_with_debug_output(self, async_client, test_db):
    \"\"\"Test with detailed debug output.\"\"\"
    print(f"Test database URL: {test_db.bind.url}")

    # Log request details
    import json
    request_data = {"test": "data"}
    print(f"Making request with: {json.dumps(request_data, indent=2)}")

    response = await async_client.post("/api/test", json=request_data)
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")

    assert response.status_code == 200
```

TROUBLESHOOTING COMMON ISSUES
============================

1. **Database Connection Issues**:
   - Verify database URL configuration
   - Check database server availability
   - Ensure proper authentication credentials

2. **Authentication Failures**:
   - Verify user credentials in test data setup
   - Check token expiration settings
   - Ensure proper header formatting

3. **Rate Limiting in Tests**:
   - Increase rate limits for test environment
   - Use test-specific rate limit configuration
   - Space out requests in performance tests

4. **Async Issues**:
   - Use proper async test markers
   - Handle event loop properly
   - Avoid blocking operations in async tests

5. **Mock Issues**:
   - Ensure proper mock setup
   - Verify mock return values
   - Use appropriate patch decorators

INTEGRATION TEST CHECKLIST
=========================

Before running integration tests:

- [ ] Database is properly configured
- [ ] All external dependencies are mocked
- [ ] Test data is properly set up
- [ ] Authentication mechanisms work
- [ ] Cleanup procedures are in place

After running integration tests:

- [ ] All tests pass consistently
- [ ] Performance metrics are acceptable
- [ ] No resource leaks detected
- [ ] Test data is properly cleaned up
- [ ] Coverage requirements are met

EXTENDING INTEGRATION TESTS
===========================

To add new integration tests:

1. **Identify the workflow** to test
2. **Create test class** inheriting from appropriate base
3. **Set up test data** needed for the workflow
4. **Implement test methods** following the patterns above
5. **Add cleanup procedures** for test data
6. **Run and verify** the new tests

Example new test class:

```python
class TestNewFeatureIntegration:
    \"\"\"Integration tests for new feature.\"\"\"

    @pytest.mark.asyncio
    async def test_new_feature_workflow(self, async_client, test_db):
        \"\"\"Test complete workflow for new feature.\"\"\"
        # Follow the established patterns
        pass

    @pytest.mark.asyncio
    async def test_new_feature_error_handling(self, async_client, test_db):
        \"\"\"Test error handling for new feature.\"\"\"
        # Test error scenarios
        pass
```

This documentation provides a comprehensive guide for understanding,
implementing, and maintaining integration tests for the application.
"""

# Integration test examples and utilities
class IntegrationTestExamples:
    """Collection of integration test examples and utilities."""

    @staticmethod
    def create_test_student_data(suffix: str = "") -> dict:
        """Create standardized test student data."""
        return {
            "name": f"Test Student {suffix}",
            "father_name": f"Test Father {suffix}",
            "class_name": "10A",
            "mobile": f"9876543{suffix}",
            "address": f"Test Address {suffix}",
            "route": "Route 1"
        }

    @staticmethod
    def create_test_driver_data(suffix: str = "") -> dict:
        """Create standardized test driver data."""
        return {
            "name": f"Test Driver {suffix}",
            "license_number": f"DL123456{suffix}",
            "vehicle_number": f"TEST{suffix}",
            "mobile": f"9876543{suffix}",
            "experience_years": 5
        }

    @staticmethod
    def generate_unique_mobile() -> str:
        """Generate unique mobile number for testing."""
        import random
        return f"987654{random.randint(1000, 9999)}"

    @staticmethod
    def assert_student_response_structure(response_data: dict):
        """Assert that student response has correct structure."""
        required_fields = ["id", "name", "father_name", "class_name", "mobile", "address", "route"]
        for field in required_fields:
            assert field in response_data, f"Missing required field: {field}"

    @staticmethod
    def assert_driver_response_structure(response_data: dict):
        """Assert that driver response has correct structure."""
        required_fields = ["id", "name", "license_number", "vehicle_number", "mobile", "experience_years"]
        for field in required_fields:
            assert field in response_data, f"Missing required field: {field}"


# Test helper functions for common operations
async def authenticate_user(async_client, email: str, password: str) -> str:
    """Helper function to authenticate user and return token."""
    login_data = {
        "username_or_email": email,
        "password": password
    }

    response = await async_client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
    return response.json()["access_token"]


async def create_guest_user(async_client) -> tuple:
    """Helper function to create guest user and return token and ID."""
    response = await async_client.post("/api/auth/guest")
    assert response.status_code == 200
    data = response.json()
    return data["access_token"], data["guest_id"]


async def cleanup_student(async_client, headers: dict, student_id: int):
    """Helper function to cleanup test student."""
    response = await async_client.delete(f"/api/students/{student_id}", headers=headers)
    assert response.status_code == 200


async def cleanup_driver(async_client, headers: dict, driver_id: int):
    """Helper function to cleanup test driver."""
    response = await async_client.delete(f"/api/drivers/{driver_id}", headers=headers)
    assert response.status_code == 200


# Performance testing utilities
import time
import asyncio
from typing import List, Callable


async def measure_performance(async_client, operation: Callable, iterations: int = 100) -> dict:
    """Measure performance of async operation."""
    start_time = time.time()

    tasks = [operation() for _ in range(iterations)]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    end_time = time.time()
    duration = end_time - start_time

    success_count = sum(1 for result in results if not isinstance(result, Exception))
    success_rate = success_count / iterations

    return {
        "total_time": duration,
        "average_time_per_operation": duration / iterations,
        "success_rate": success_rate,
        "iterations": iterations
    }


def generate_performance_report(performance_data: dict) -> str:
    """Generate human-readable performance report."""
    report = """
Performance Test Results:
========================
Total Time: {:.2f} seconds
Average Time per Operation: {:.4f} seconds
Success Rate: {:.2%} ({:.1f}%)
Iterations: {}

Recommendations:
- Target: < 1.0s average per operation
- Success Rate: > 95%
- Total Time: < 30s for 100 operations
""".format(
        performance_data['total_time'],
        performance_data['average_time_per_operation'],
        performance_data['success_rate'],
        performance_data['success_rate']*100,
        performance_data['iterations']
    )
    return report


# Export test utilities for use in other test files
__all__ = [
    "IntegrationTestExamples",
    "authenticate_user",
    "create_guest_user",
    "cleanup_student",
    "cleanup_driver",
    "measure_performance",
    "generate_performance_report"
]