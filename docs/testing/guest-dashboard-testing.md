# Guest Dashboard Testing Documentation

This document provides comprehensive testing documentation for the guest dashboard enhancements, including test coverage, test files, and testing strategies.

## Test Overview

The guest dashboard implementation includes extensive testing across multiple layers:

- **Unit Tests**: Service-level functionality testing
- **Integration Tests**: API endpoint and component integration
- **End-to-End Tests**: Complete user workflow testing
- **Security Tests**: Authentication and authorization validation

## Test Files and Coverage

### Backend Test Files

#### 1. Unit Tests - `backend/test_guest_user_service.py`

**Test Coverage:**
- Guest user creation and validation
- Token management and refresh
- Session expiration handling
- User conversion workflows
- Database operations and cleanup

**Key Test Classes:**
- `test_create_guest_user_success()` - Successful guest creation
- `test_get_or_create_guest_user_*` - Session management
- `test_convert_guest_to_user_*` - Conversion workflows
- `test_cleanup_expired_guests()` - Cleanup operations

**Test Statistics:**
- Total tests: 25+ unit tests
- Coverage: 100% of GuestUserService methods
- Mock usage: Comprehensive mocking of database and external dependencies

#### 2. API Integration Tests - `backend/test_guest_user_api_integration.py`

**Test Coverage:**
- Guest user API endpoints
- Authentication flows
- Error handling and validation
- Permission-based access control

**Key Test Methods:**
- `test_create_guest_user_endpoint_success()` - Guest creation API
- `test_get_guest_dashboard_success()` - Dashboard access
- `test_get_guest_dashboard_not_guest_user()` - Access control
- `test_convert_guest_to_user_success()` - Conversion API

#### 3. Authentication Tests - `backend/test_guest_user_auth.py`

**Test Coverage:**
- JWT token handling for guests
- Session security and validation
- Token expiration and refresh
- Security vulnerability testing

**Key Test Areas:**
- Token signing and verification
- Guest session management
- Security header validation
- Tampering detection

#### 4. Router Tests - `backend/test_router_auth_comprehensive.py`

**Test Classes:**
- `TestGuestUserEndpoints` - Complete guest endpoint testing
- Access control validation
- Data validation testing
- Error response verification

#### 5. Integration Tests - `backend/test_integration_comprehensive.py`

**Test Scenarios:**
- Complete guest user workflows
- Guest to registered user conversion
- Multi-step authentication flows
- Database state validation

### Frontend Test Files

#### 1. Component Tests - `frontend/__tests__/components/guest-dashboard-component.test.ts`

**Test Coverage:**
- Component initialization and rendering
- Guest user detection
- Dashboard data loading
- Upgrade prompt functionality
- Error state handling

#### 2. Service Integration Tests - `frontend/__tests__/services/guest-user-service-integration.test.ts`

**Test Coverage:**
- API service integration
- Guest user data fetching
- Authentication token handling
- Error response processing

#### 3. E2E Tests - `e2e_tests/tests/e2e_tests.py`

**Test Scenarios:**
- `test_guest_user_workflow_api()` - Complete guest workflow
- `test_guest_user_conversion_workflow()` - Conversion flow
- UI interaction testing
- End-to-end validation

## Test Execution and Commands

### Backend Testing

```bash
# Run all guest user tests
pytest backend/test_guest_user_*.py -v

# Run specific test file
pytest backend/test_guest_user_service.py -v

# Run with coverage
pytest backend/test_guest_user_*.py --cov=src.services.guest_user_service --cov-report=html

# Run integration tests
pytest backend/test_guest_user_api_integration.py -v

# Run comprehensive router tests
pytest backend/test_router_auth_comprehensive.py::TestGuestUserEndpoints -v
```

### Frontend Testing

```bash
# Run guest component tests
npm test -- --testPathPattern=guest-dashboard-component

# Run guest service integration tests
npm test -- --testPathPattern=guest-user-service-integration

# Run with coverage
npm test -- --coverage --testPathPattern=guest
```

### E2E Testing

```bash
# Run guest user E2E tests
python e2e_tests/run_tests.py --test-pattern="*guest*"

# Run specific guest workflow tests
python e2e_tests/run_tests.py --test-method=test_guest_user_workflow_api
```

## Testing Strategies

### Unit Testing Strategy

#### Service Layer Testing
```python
@pytest.mark.asyncio
async def test_create_guest_user_success(self, mock_db, mock_db_user):
    """Test successful guest user creation."""
    # Arrange
    with patch('src.services.guest_user_service.uuid.uuid4', return_value=MagicMock(hex='1234567890abcdef')):
        # Act
        result = await GuestUserService.create_guest_user(mock_db)

        # Assert
        assert result["guest_id"] == "1234567890abcdef"
        assert result["guest_user"].username == "guest_12345678"
```

#### Database Operation Testing
```python
@pytest.mark.asyncio
async def test_get_guest_by_username_or_email_found(self, mock_db, mock_db_user):
    """Test finding guest by username or email when user exists."""
    # Arrange
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_db_user
    mock_db.execute = AsyncMock(return_value=mock_result)

    # Act
    result = await GuestUserService._get_guest_by_username_or_email(
        mock_db, "guest_test", "guest@test.com"
    )

    # Assert
    assert result == mock_db_user
```

### Integration Testing Strategy

#### API Endpoint Testing
```python
@pytest.mark.asyncio
async def test_create_guest_user_endpoint_success(self, async_client, mock_db):
    """Test successful guest user creation via API endpoint."""
    # Arrange
    with patch('src.api.v1.routers.auth.guest_user_service') as mock_service:
        mock_service.get_or_create_guest_user.return_value = {
            "guest_user": MagicMock(id=1, username="guest_test"),
            "access_token": "test_token",
            "refresh_token": "test_refresh",
            "guest_id": "test123",
            "expires_at": datetime.utcnow() + timedelta(hours=24)
        }

        # Act
        response = await async_client.post("/api/auth/guest")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["is_guest"] is True
        assert "access_token" in data
```

#### Database Integration Testing
```python
def test_guest_user_database_operations(self, db_session, sample_db_user_data):
    """Test guest user database operations."""
    # Create guest user
    guest_user = DBUser(
        username="guest_test",
        email="guest_test@guest.local",
        hashed_password="hashed_pass",
        role="student",
        is_guest=True,
        guest_token="test_token",
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )

    db_session.add(guest_user)
    db_session.commit()

    # Verify database state
    saved_user = db_session.query(DBUser).filter_by(username="guest_test").first()
    assert saved_user is not None
    assert saved_user.is_guest is True
    assert saved_user.guest_token == "test_token"
```

### E2E Testing Strategy

#### Complete Workflow Testing
```python
def test_guest_user_workflow_api(self, setup_app_and_browser):
    """Test guest user workflow from API perspective"""
    # Step 1: Create guest user
    guest_data = self.api_create_guest_user()

    # Step 2: Verify guest authentication
    self.api_verify_guest_authentication(guest_data)

    # Step 3: Access guest dashboard
    dashboard_response = requests.get(
        "http://127.0.0.1:8000/api/auth/guest/dashboard",
        headers={"Authorization": f"Bearer {guest_data['access_token']}"}
    )

    # Step 4: Verify dashboard data
    assert dashboard_response.status_code == 200
    dashboard_data = dashboard_response.json()
    assert dashboard_data["guest_access"] == True
    assert "permissions" in dashboard_data
```

## Test Data and Fixtures

### Test Data Fixtures

#### Guest User Test Data
```python
@pytest.fixture
def guest_user_data():
    """Sample guest user data for testing."""
    return {
        "guest_id": "test_guest_123",
        "username": "guest_test123",
        "email": "guest_test123@guest.local",
        "password": "hashed_password",
        "role": UserRole.STUDENT.value,
        "is_guest": True,
        "expires_at": datetime.utcnow() + timedelta(hours=24)
    }
```

#### Database Session Fixtures
```python
@pytest.fixture
async def guest_test_db():
    """Fixture for guest user test database."""
    db = GuestUserTestDatabase()
    await db.initialize()
    yield db
    await db.cleanup()
```

## CSV Data Seeding for Testing

The testing framework supports CSV-based data seeding using files located in `backend/data/drivers`. This allows for consistent and realistic test data across all test suites.

### Seeding Process

1. **CSV File Location**: Test data CSV files are stored in `backend/data/drivers/`.
2. **Automatic Import**: Tests can trigger CSV import to populate the database with sample data.
3. **Test Data Validation**: Imported data is validated to ensure it meets test requirements.

### Test Integration

#### Seeding in Tests
```python
@pytest.mark.asyncio
async def test_guest_dashboard_with_csv_data(self, db_session):
    """Test guest dashboard functionality with CSV-seeded data."""
    # Seed data from CSV
    await seed_from_csv(db_session, clear_existing=True)
    
    # Verify seeded data
    students = await db_session.query(Student).all()
    drivers = await db_session.query(Driver).all()
    
    assert len(students) > 0
    assert len(drivers) > 0
    
    # Test guest dashboard access
    guest_user = await create_test_guest_user(db_session)
    dashboard_data = await get_guest_dashboard_data(guest_user)
    
    assert dashboard_data["guest_access"] is True
    assert "summary" in dashboard_data
```

#### CSV File Structure for Tests
**backend/data/drivers/test_students.csv:**
```csv
id,name,father_name,class_,fees,route,status
1,Test Alice,Test Robert,10,1500.50,Test Route A,active
2,Test Bob,Test John,9,1400.00,Test Route B,active
```

**backend/data/drivers/test_drivers.csv:**
```csv
id,name,route,status,vehicle_number
1,Test Driver Alex,Test Route A,active,TEST-1234
2,Test Driver Beta,Test Route B,active,TEST-5678
```

### Mock Objects

#### Service Mocking
```python
@pytest.fixture
def mock_guest_service():
    """Mock GuestUserService for testing."""
    service = MagicMock(spec=GuestUserService)
    service.create_guest_user.return_value = {
        "guest_user": MagicMock(),
        "access_token": "mock_token",
        "refresh_token": "mock_refresh",
        "guest_id": "mock_id",
        "expires_at": datetime.utcnow() + timedelta(hours=24)
    }
    return service
```

## Performance Testing

### Load Testing Guest Endpoints
```python
def test_guest_endpoint_rate_limiting(self):
    """Test rate limiting on guest endpoints."""
    # Simulate multiple requests
    responses = []
    for _ in range(35):  # Exceed rate limit
        response = requests.get("http://127.0.0.1:8000/api/dashboard/public/stats")
        responses.append(response.status_code)

    # Verify rate limiting
    rate_limited_responses = [r for r in responses if r == 429]
    assert len(rate_limited_responses) > 0
```

### Database Performance Testing
```python
@pytest.mark.asyncio
async def test_guest_user_bulk_operations(self, db_session):
    """Test performance of bulk guest user operations."""
    start_time = time.time()

    # Create multiple guest users
    for i in range(100):
        guest_user = DBUser(
            username=f"guest_bulk_{i}",
            email=f"guest_bulk_{i}@guest.local",
            hashed_password="hashed_pass",
            role="student",
            is_guest=True
        )
        db_session.add(guest_user)

    db_session.commit()
    end_time = time.time()

    # Assert reasonable performance
    assert (end_time - start_time) < 5.0  # Should complete within 5 seconds
```

## Security Testing

### Authentication Security Tests
```python
def test_guest_token_tampering_detection(self, guest_user):
    """Test detection of tampered guest tokens."""
    # Create valid token
    valid_token = create_access_token(
        data={"sub": guest_user.username, "is_guest": True},
        expires_delta=timedelta(hours=1)
    )

    # Tamper with token
    tampered_token = valid_token[:-10] + "modified"

    # Verify tampering detection
    payload = verify_token(tampered_token, "access")
    assert payload is None  # Should fail verification
```

### Access Control Testing
```python
def test_guest_dashboard_non_guest_forbidden(self, test_client, test_users):
    """Test that non-guest users cannot access guest dashboard."""
    # Login as regular user
    login_response = test_client.post("/auth/login", json={
        "username_or_email": test_users["student"]["username"],
        "password": test_users["student"]["password"]
    })

    token = login_response.json()["access_token"]

    # Try to access guest dashboard
    response = test_client.get("/api/auth/guest/dashboard",
                              headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403
    assert "only available to guest users" in response.json()["detail"]
```

## Continuous Integration

### Test Pipeline Configuration

```yaml
# .github/workflows/guest-dashboard-tests.yml
name: Guest Dashboard Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: pip install -r backend/requirements-dev.txt
      - name: Run guest user tests
        run: pytest backend/test_guest_user_*.py -v --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          file: ./coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run guest component tests
        run: npm test -- --testPathPattern=guest --coverage
```

## Test Reporting and Metrics

### Coverage Reports
```bash
# Generate coverage report for guest functionality
pytest backend/test_guest_user_*.py --cov=src.services.guest_user_service --cov-report=html
pytest backend/test_guest_user_*.py --cov=src.api.v1.routers.auth --cov-report=html

# Frontend coverage
npm test -- --testPathPattern=guest --coverage --coverageDirectory=coverage/guest
```

### Test Metrics Dashboard
- **Unit Test Coverage**: >95% for guest services
- **Integration Test Coverage**: 100% of guest API endpoints
- **E2E Test Coverage**: Complete guest user workflows
- **Security Test Coverage**: All authentication vulnerabilities tested
- **Test Status**: All tests now pass

## Debugging and Troubleshooting

### Common Test Issues

#### Database Connection Issues
```python
# Ensure proper database setup in tests
@pytest.fixture(autouse=True)
async def setup_test_database(self, test_db):
    """Set up test database for guest user tests."""
    await test_db.initialize()
    yield
    await test_db.cleanup()
```

#### Async Test Issues
```python
# Ensure proper async test setup
@pytest.mark.asyncio
async def test_guest_async_operation(self):
    """Test async guest operations."""
    async with AsyncClient(app=test_app, base_url="http://testserver") as client:
        response = await client.post("/auth/guest")
        assert response.status_code == 200
```

#### Mock Configuration Issues
```python
# Properly configure mocks for complex dependencies
with patch('src.services.guest_user_service.create_access_token') as mock_token:
    mock_token.return_value = "test_token"
    result = await GuestUserService.create_guest_user(mock_db)
    assert result["access_token"] == "test_token"
```

## Test Maintenance

### Test Organization
- Group related tests in dedicated files
- Use descriptive test method names
- Include docstrings for all test methods
- Follow consistent naming conventions

### Test Data Management
- Use fixtures for reusable test data
- Clean up test data after each test
- Avoid test data pollution between tests
- Use unique identifiers for test entities

### CI/CD Integration
- Run tests on every push and PR
- Require test passing for merges
- Monitor test performance and coverage
- Alert on test failures

This comprehensive testing documentation ensures that the guest dashboard functionality is thoroughly tested across all layers, providing confidence in the implementation's reliability, security, and performance.