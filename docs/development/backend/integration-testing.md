# 🔬 Comprehensive Integration Tests

This document describes the comprehensive integration testing suite for the Student Profiles API application.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Categories](#test-categories)
- [Test Files](#test-files)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The integration test suite provides comprehensive coverage of:

- **Complete user journeys** from authentication to data operations
- **Data flow between services** (auth, CRUD, sync, reports, charts)
- **End-to-end functionality** including error scenarios
- **Cross-service interactions** and dependencies
- **Database transactions** and rollbacks
- **Performance and load testing** scenarios

## 📁 Test Categories

### 1. Authentication Workflow Integration
- **File**: `test_integration_comprehensive.py` - `TestAuthenticationWorkflowIntegration`
- **Coverage**:
  - Complete login/logout flows
  - Guest user creation and conversion
  - Token refresh and management
  - Role-based access control
  - Rate limiting for auth endpoints

### 2. CRUD Operations Integration
- **File**: `test_integration_comprehensive.py` - `TestCRUDOperationsIntegration`
- **Coverage**:
  - Complete Create, Read, Update, Delete workflows
  - Student and driver management
  - Data validation and constraints
  - Bulk operations
  - Search and pagination

### 3. Data Flow Integration
- **File**: `test_integration_comprehensive.py` - `TestDataFlowIntegration`
- **Coverage**:
  - CSV sync service integration
  - Reports service data aggregation
  - Charts service data visualization
  - Data consistency across services

### 4. Error Scenarios and Edge Cases
- **File**: `test_integration_comprehensive.py` - `TestErrorScenariosIntegration`
- **Coverage**:
  - Rate limiting across endpoints
  - Database transaction rollbacks
  - Concurrent operation handling
  - Invalid data handling
  - Authentication failures

### 5. End-to-End User Journeys
- **File**: `test_integration_comprehensive.py` - `TestEndToEndUserJourneys`
- **Coverage**:
  - Admin complete management workflow
  - Guest to registered user journey
  - Teacher data management workflow
  - Cross-role functionality

### 6. Cross-Service Integration
- **File**: `test_integration_comprehensive.py` - `TestCrossServiceIntegration`
- **Coverage**:
  - Authentication + CRUD interactions
  - Data sync + reports integration
  - Role-based service access
  - Service dependency testing

### 7. Database Transaction Integration
- **File**: `test_integration_comprehensive.py` - `TestDatabaseTransactionIntegration`
- **Coverage**:
  - Transaction rollback on failures
  - Cross-entity consistency
  - Data integrity validation
  - Concurrent transaction handling

### 8. Performance and Load Integration
- **File**: `test_integration_comprehensive.py` - `TestPerformanceAndLoadIntegration`
- **Coverage**:
  - Bulk operations performance
  - Search performance with large datasets
  - Concurrent session handling
  - Memory usage validation

### 9. Chat Integration Tests
- **File**: `test_chat_integration.py` - `TestChat*`
- **Coverage**:
  - Chat with authenticated users
  - Chat with guest users
  - Message persistence
  - Context handling
  - Error recovery
  - Performance testing

## 📄 Test Files

| File | Purpose | Test Classes |
|------|---------|--------------|
| `test_integration_comprehensive.py` | Main integration tests | 8 test classes, 25+ test methods |
| `test_chat_integration.py` | Chat-specific integration | 3 test classes, 15+ test methods |
| `test_integration_documentation.py` | Documentation and examples | Examples and utilities |
| `run_integration_tests.py` | Test runner and reporting | Automated test execution |

## 🚀 Running Tests

### Basic Usage

```bash
# Run all integration tests
python run_integration_tests.py

# Run specific category
python run_integration_tests.py --category auth

# Run with coverage report
python run_integration_tests.py --coverage

# Run performance tests only
python run_integration_tests.py --performance-only

# Run all categories separately
python run_integration_tests.py --all-categories

# Verbose output
python run_integration_tests.py --verbose
```

### Using pytest directly

```bash
# Run all integration tests
pytest test_integration_comprehensive.py -v

# Run specific test class
pytest test_integration_comprehensive.py::TestAuthenticationWorkflowIntegration -v

# Run specific test method
pytest test_integration_comprehensive.py::TestCRUDOperationsIntegration::test_student_crud_complete_workflow -v

# Run with coverage
pytest test_integration_comprehensive.py --cov=src --cov-report=html

# Run performance tests
pytest test_integration_comprehensive.py -k performance -v
```

## 🏗️ Test Structure

### Framework Architecture

```
IntegrationTestFramework
├── setup_test_data()           # Create comprehensive test data
├── cleanup_test_data()         # Clean up after tests
├── get_user_credentials()      # Role-based credentials
└── Test Data Management        # Students, drivers, users
```

### Test Class Hierarchy

```
TestAuthenticationWorkflowIntegration
├── test_complete_admin_login_logout_flow()
├── test_guest_user_complete_workflow()
├── test_invalid_credentials_flow()
└── test_role_based_access_control_integration()

TestCRUDOperationsIntegration
├── test_student_crud_complete_workflow()
├── test_driver_crud_complete_workflow()
└── test_crud_validation_errors_integration()

TestDataFlowIntegration
├── test_csv_sync_data_flow_integration()
├── test_reports_data_flow_integration()
└── test_charts_data_flow_integration()
```

### Fixture Structure

```python
@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create test database engine."""

@pytest_asyncio.fixture
async def test_db(test_engine):
    """Create test database session with data."""

@pytest.fixture
def test_app():
    """Create FastAPI test application."""

@pytest_asyncio.fixture
async def async_client(test_app):
    """Create async test client."""
```

## 🛠️ Test Data Management

### Test Data Setup

The framework automatically creates:
- **Users**: Admin, teacher, driver roles
- **Students**: Multiple test students with different classes
- **Drivers**: Test drivers with various experience levels
- **Clean state**: Proper isolation between tests

### Data Creation Utilities

```python
# Create test student
student_data = {
    "name": "Test Student",
    "father_name": "Test Father",
    "class_name": "10A",
    "mobile": "9876543210",
    "address": "Test Address",
    "route": "Route 1"
}

# Create test driver
driver_data = {
    "name": "Test Driver",
    "license_number": "DL123456789",
    "vehicle_number": "ABC123",
    "mobile": "9876543201",
    "experience_years": 5
}
```

## 🔐 Authentication Testing

### Role-Based Testing

```python
# Test admin access
admin_login = {"username_or_email": "admin@test.com", "password": "adminpass123"}
response = await async_client.post("/api/auth/login", json=admin_login)
admin_token = response.json()["access_token"]

# Test teacher access
teacher_login = {"username_or_email": "teacher@test.com", "password": "teacherpass123"}
response = await async_client.post("/api/auth/login", json=teacher_login)
teacher_token = response.json()["access_token"]

# Test guest access
response = await async_client.post("/api/auth/guest")
guest_token = response.json()["access_token"]
```

### Token Management Testing

```python
# Test token refresh
headers = {"Authorization": f"Bearer {access_token}"}
response = await async_client.post("/api/auth/refresh", headers=headers)
assert response.status_code == 200
new_token = response.json()["access_token"]

# Test logout
response = await async_client.post("/api/auth/logout", headers=headers)
assert response.status_code == 200

# Verify token invalidation
response = await async_client.get("/api/auth/me", headers={"Authorization": f"Bearer {access_token}"})
assert response.status_code == 401
```

## 🔄 CRUD Operations Testing

### Complete Workflow Testing

```python
@pytest.mark.asyncio
async def test_student_crud_complete_workflow(self, async_client, test_db):
    # 1. CREATE
    student_data = {...}
    response = await async_client.post("/api/students/", json=student_data, headers=headers)
    student_id = response.json()["id"]

    # 2. READ (list)
    response = await async_client.get("/api/students/", headers=headers)
    students = response.json()["students"]
    assert student_id in [s["id"] for s in students]

    # 3. READ (single)
    response = await async_client.get(f"/api/students/{student_id}", headers=headers)
    assert response.status_code == 200

    # 4. UPDATE
    update_data = {"class_name": "10B"}
    response = await async_client.put(f"/api/students/{student_id}", json=update_data, headers=headers)
    assert response.status_code == 200

    # 5. DELETE
    response = await async_client.delete(f"/api/students/{student_id}", headers=headers)
    assert response.status_code == 200
```

### Validation Testing

```python
@pytest.mark.asyncio
async def test_validation_errors(self, async_client, test_db):
    # Test duplicate mobile
    response = await async_client.post("/api/students/", json=invalid_data, headers=headers)
    assert response.status_code == 400

    # Test invalid mobile format
    response = await async_client.post("/api/students/", json=invalid_mobile_data, headers=headers)
    assert response.status_code == 422
```

## 📊 Performance Testing

### Load Testing

```python
@pytest.mark.asyncio
async def test_bulk_operations_performance(self, async_client, test_db):
    start_time = time.time()

    # Create 100 students
    for i in range(100):
        student_data = {...}
        response = await async_client.post("/api/students/", json=student_data, headers=headers)

    duration = time.time() - start_time
    assert duration < 30  # Should complete within 30 seconds
```

### Concurrent Testing

```python
@pytest.mark.asyncio
async def test_concurrent_sessions(self, async_client, test_db):
    async def simulate_session(session_id: int):
        # Login and perform operations
        login_response = await async_client.post("/api/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Perform operations
        await async_client.get("/api/students/", headers=headers)
        await async_client.get("/api/health", headers=headers)

        return True

    # Run 20 concurrent sessions
    tasks = [simulate_session(i) for i in range(20)]
    results = await asyncio.gather(*tasks)

    success_rate = sum(results) / len(results)
    assert success_rate >= 0.8  # 80% success rate
```

## 🛡️ Error Handling Testing

### Rate Limiting

```python
@pytest.mark.asyncio
async def test_rate_limiting(self, async_client, test_db):
    # Exceed rate limit
    for i in range(70):  # Exceed 60/minute limit
        response = await async_client.get("/api/health")
        if i < 60:
            assert response.status_code == 200
        else:
            assert response.status_code == 429
```

### Database Rollback

```python
@pytest.mark.asyncio
async def test_transaction_rollback(self, async_client, test_db):
    initial_count = get_student_count()

    # Try invalid operation
    response = await async_client.post("/api/students/", json=invalid_data, headers=headers)
    assert response.status_code == 422

    # Verify rollback
    final_count = get_student_count()
    assert initial_count == final_count
```

## 🔧 Best Practices

### 1. Test Organization
- Group related tests in classes
- Use descriptive test method names
- Follow arrange-act-assert pattern
- Keep tests focused and isolated

### 2. Data Management
- Create minimal test data needed
- Clean up test data properly
- Use unique identifiers to avoid conflicts
- Share test data between related tests

### 3. Authentication
- Create helper methods for authentication
- Test with different user roles
- Verify proper access control
- Handle token expiration

### 4. Error Testing
- Test both success and failure scenarios
- Verify proper error responses
- Test edge cases and boundary conditions
- Validate error recovery

### 5. Performance Testing
- Set realistic performance expectations
- Test with appropriate data volumes
- Monitor resource usage
- Include baseline comparisons

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database configuration
export DATABASE_URL="postgresql://user:pass@localhost/test_db"

# Verify database server
python -c "from core.models import Base; print('Database OK')"
```

#### 2. Authentication Failures
```bash
# Check user setup
python check_dev_user.py

# Verify credentials in test data
# Ensure users exist in test database
```

#### 3. Rate Limiting in Tests
```bash
# Increase rate limits for testing
export RATE_LIMIT_REQUESTS_PER_MINUTE=1000

# Or disable rate limiting for tests
export DISABLE_RATE_LIMITING=true
```

#### 4. Async Issues
```python
# Ensure proper async setup
import pytest_asyncio

@pytest.mark.asyncio
async def test_async_function():
    # Use async client
    async with AsyncClient(app=test_app) as client:
        response = await client.get("/api/health")
```

#### 5. Import Errors
```bash
# Check Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Install test dependencies
pip install -r requirements.txt

# Verify imports
python -c "from core.models import Student; print('Imports OK')"
```

### Debug Mode

Enable debug logging for detailed output:

```python
import logging

logging.basicConfig(level=logging.DEBUG)

# Run tests with debug output
pytest test_integration_comprehensive.py -v -s
```

## 📈 Coverage Goals

Aim for comprehensive coverage:

- **Authentication**: > 95% coverage
- **CRUD Operations**: > 90% coverage
- **Error Handling**: > 85% coverage
- **Performance**: > 80% coverage
- **Integration Points**: > 90% coverage

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'

    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install pytest pytest-asyncio httpx

    - name: Run integration tests
      run: python run_integration_tests.py --coverage

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
```

## 📚 Additional Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [SQLAlchemy Testing](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Integration Testing Best Practices](https://martinfowler.com/bliki/IntegrationTest.html)

## 🤝 Contributing

To add new integration tests:

1. Identify the workflow to test
2. Create test class following existing patterns
3. Add proper setup and cleanup
4. Include error scenarios
5. Add performance considerations
6. Update documentation
7. Run and verify tests

## 📞 Support

For issues with integration tests:

1. Check the troubleshooting section
2. Review test logs for specific errors
3. Verify test environment setup
4. Check database and service dependencies
5. Review authentication configuration

---

*This integration test suite ensures reliable, scalable, and maintainable application behavior across all critical workflows and edge cases.*