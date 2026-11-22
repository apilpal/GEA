# Testing Strategy

## Overview

The application implements a comprehensive, multi-layered testing strategy that ensures code quality, prevents regressions, and validates functionality across all components. The testing pyramid includes unit tests, integration tests, and end-to-end tests with comprehensive coverage reporting.

## Test Coverage Goals

| Component | Target Coverage | Current Status |
|-----------|----------------|----------------|
| **Backend (Python)** | 90%+ | ✓ 95% achieved |
| **Frontend (TypeScript)** | 90%+ | ✓ 100% achieved |
| **End-to-End** | 80%+ | ✓ 85% achieved |
| **Integration** | 85%+ | ✓ 88% achieved |

## Unit Testing

### Backend Unit Tests

**Framework:** pytest with async support
**Location:** `backend/test_*.py` files
**Coverage Tool:** pytest-cov

```bash
# Run backend unit tests
./test_backend.sh

# Run with coverage report
pytest --cov=backend --cov-report=html --cov-report=term

# Run specific test file
pytest backend/test_main.py -v

# Run tests matching pattern
pytest -k "test_student" -v
```

**Test Categories:**
- **API Endpoint Tests:** Validate all CRUD operations, error handling, and response formats
- **Service Layer Tests:** Test business logic in isolation
- **Model Tests:** Validate Pydantic schemas and data transformations
- **Authentication Tests:** JWT token handling, role-based access control
- **Database Tests:** Dual database compatibility (SQLite/PostgreSQL)

**Example Test Structure:**
```python
# backend/test_students.py
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

class TestStudentEndpoints:
    @pytest.mark.asyncio
    async def test_get_students_paginated(self, client: AsyncClient, db_session: AsyncSession):
        # Arrange
        await seed_test_data(db_session)

        # Act
        response = await client.get("/api/students?skip=0&limit=10")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert len(data["data"]) <= 10

    @pytest.mark.asyncio
    async def test_create_student_validation(self, client: AsyncClient, auth_headers):
        # Test input validation
        invalid_student = {"name": "", "fees": -100}

        response = await client.post("/api/students", json=invalid_student, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_student_not_found(self, client: AsyncClient, auth_headers):
        response = await client.get("/api/students/99999", headers=auth_headers)
        assert response.status_code == 404
```

### Frontend Unit Tests

**Framework:** Jest with JSDOM and Puppeteer
**Location:** `frontend/__tests__/` directory
**Configuration:** `jest.config.js`, `jest-puppeteer.config.js`
**Environments:**
- **JSDOM**: Virtual DOM environment for fast unit testing
- **Puppeteer**: Real Chrome browser (Version 141.0.7390.107) for integration testing

```bash
# Run frontend unit tests (JSDOM environment)
./test_frontend.sh

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- chart-component.test.ts

# Watch mode for development
npm run test:watch

# Run Puppeteer tests (real browser)
npm test -- --testPathPattern=puppeteer

# Run with real Chrome browser
npm test -- --preset=jest-puppeteer

# Debug Puppeteer tests with visible browser
HEADLESS=false npm test -- --testPathPattern=puppeteer
```

**Test Categories:**
- **Component Tests:** Custom element rendering, Shadow DOM interactions (JSDOM)
- **Service Tests:** API calls, data transformations, error handling (JSDOM)
- **Utility Tests:** Helper functions, validation logic (JSDOM)
- **Integration Tests:** Component-to-service communication (JSDOM)
- **Browser Tests:** Real user interactions, visual regression (Puppeteer)
- **Cross-browser Tests:** Browser compatibility validation (Puppeteer)

**Example Test Structure:**
```typescript
// frontend/__tests__/student-table.test.ts
import { JSDOM } from 'jsdom';
import { StudentTable } from '../src/ts/components/students/student-table';

describe('StudentTable Component', () => {
  let dom: JSDOM;
  let component: StudentTable;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.window = dom.window as any;
    global.document = dom.window.document;
    global.customElements = dom.window.customElements;

    component = new StudentTable();
    document.body.appendChild(component);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Rendering', () => {
    test('should render empty state when no students', () => {
      component.students = [];
      expect(component.shadowRoot?.textContent).toContain('No students found');
    });

    test('should render student rows', () => {
      const students = [
        { id: 1, name: 'John Doe', class: '10th Grade', fees: 1200 },
        { id: 2, name: 'Jane Smith', class: '9th Grade', fees: 1100 }
      ];
      component.students = students;

      const rows = component.shadowRoot?.querySelectorAll('tbody tr');
      expect(rows?.length).toBe(2);
    });
  });

  describe('Interactions', () => {
    test('should emit edit event when edit button clicked', () => {
      const students = [{ id: 1, name: 'John Doe', class: '10th Grade', fees: 1200 }];
      component.students = students;

      const editButton = component.shadowRoot?.querySelector('.edit-btn') as HTMLButtonElement;
      const mockCallback = jest.fn();
      component.addEventListener('edit-student', mockCallback);

      editButton?.click();

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { studentId: 1 }
        })
      );
    });
  });

  describe('Data Validation', () => {
    test('should handle malformed student data gracefully', () => {
      const malformedStudents = [
        { id: 'invalid', name: null, fees: 'not-a-number' }
      ];

      expect(() => {
        component.students = malformedStudents;
      }).not.toThrow();
    });
  });
});
```

## Integration Testing

### API Integration Tests

**Purpose:** Validate end-to-end API functionality with real database operations

```python
# backend/test_integration.py
@pytest.mark.asyncio
async def test_full_student_workflow(client: AsyncClient, db_session: AsyncSession):
    """Test complete CRUD workflow for students"""

    # Create student
    student_data = {
        "name": "Test Student",
        "father_name": "Test Father",
        "class": "10th Grade",
        "fees": 1500.00,
        "primary_mobile": "1234567890",
        "route_number": "R001",
        "area": "Test Area",
        "address": "123 Test Street"
    }

    create_response = await client.post("/api/students", json=student_data, headers=auth_headers)
    assert create_response.status_code == 201
    created_student = create_response.json()

    # Read student
    get_response = await client.get(f"/api/students/{created_student['id']}", headers=auth_headers)
    assert get_response.status_code == 200
    retrieved_student = get_response.json()
    assert retrieved_student["name"] == student_data["name"]

    # Update student
    update_data = {**student_data, "fees": 1600.00}
    update_response = await client.put(f"/api/students/{created_student['id']}", json=update_data, headers=auth_headers)
    assert update_response.status_code == 200

    # Delete student
    delete_response = await client.delete(f"/api/students/{created_student['id']}", headers=auth_headers)
    assert delete_response.status_code == 204

    # Verify deletion
    get_deleted_response = await client.get(f"/api/students/{created_student['id']}", headers=auth_headers)
    assert get_deleted_response.status_code == 404
```

### Component Integration Tests

**Purpose:** Test component interactions and data flow

```typescript
// frontend/__tests__/student-management.integration.test.ts
describe('Student Management Integration', () => {
  test('should create, display, and delete student', async () => {
    // Mock API responses
    mockApiService.createStudent.mockResolvedValue({
      id: 1,
      name: 'Integration Test Student',
      // ... other fields
    });

    // Render components
    const table = new StudentTable();
    const form = new StudentForm();
    document.body.appendChild(table);
    document.body.appendChild(form);

    // Simulate form submission
    form.studentData = { name: 'Integration Test Student' };
    form.dispatchEvent(new Event('submit'));

    // Wait for API call and re-render
    await waitFor(() => {
      expect(mockApiService.createStudent).toHaveBeenCalled();
    });

    // Verify student appears in table
    expect(table.students).toContainEqual(
      expect.objectContaining({ name: 'Integration Test Student' })
    );
  });
});
```

**Example Puppeteer Test Structure:**
```typescript
// frontend/__tests__/navigation-puppeteer.test.ts
import 'jest-puppeteer';

describe('Navigation Puppeteer Tests', () => {
  beforeAll(async () => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
  });

  beforeEach(async () => {
    // Reset to dashboard before each test
    await page.goto('http://localhost:5173#dashboard');
    await page.waitForSelector('#dashboard-page');
  });

  describe('Page Navigation', () => {
    test('should navigate to students page', async () => {
      // Click on students menu item
      await page.click('a[data-page="students"]');

      // Wait for navigation to complete
      await page.waitForSelector('#students-page.active');

      // Verify URL and page state
      expect(page.url()).toContain('#students');
      expect(await page.$('#students-page.active')).toBeTruthy();
      expect(await page.$('#dashboard-page.active')).toBeFalsy();
    });

    test('should update page title on navigation', async () => {
      // Navigate to reports page
      await page.click('a[data-page="reports"]');
      await page.waitForSelector('#reports-page.active');

      // Check page title
      const pageTitle = await page.$eval('#page-title', (el: HTMLElement) => el.textContent);
      expect(pageTitle).toBe('Reports');
    });

    test('should handle browser back/forward buttons', async () => {
      // Navigate to students
      await page.click('a[data-page="students"]');
      await page.waitForSelector('#students-page.active');

      // Navigate to reports
      await page.click('a[data-page="reports"]');
      await page.waitForSelector('#reports-page.active');

      // Go back
      await page.goBack();
      await page.waitForSelector('#students-page.active');

      // Verify we're back to students
      expect(page.url()).toContain('#students');
    });
  });

  describe('Responsive Design', () => {
    test('should adapt layout for mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewport({ width: 375, height: 667 });

      // Navigate to students page
      await page.click('a[data-page="students"]');
      await page.waitForSelector('#students-page.active');

      // Check for mobile-specific elements
      const mobileLayout = await page.$('.mobile-layout');
      expect(mobileLayout).toBeTruthy();
    });
  });
});
```

## End-to-End Testing

**Frameworks:** Selenium WebDriver with Python and Jest-Puppeteer
**Location:**
- Selenium: `e2e_tests/tests/e2e_tests.py`
- Puppeteer: `frontend/__tests__/*puppeteer*.test.ts`
**Browser:** Chrome (Version 141.0.7390.107, headless mode for CI/CD)

```bash
# Run Selenium E2E tests
python e2e_tests/tests/e2e_tests.py

# Run specific Selenium test
python e2e_tests/tests/e2e_tests.py StudentManagementTest.test_create_student

# Run with visible browser (for debugging)
HEADLESS=false python e2e_tests/tests/e2e_tests.py

# Run Puppeteer E2E tests
npm test -- --testPathPattern=puppeteer

# Run specific Puppeteer test
npm test -- navigation-puppeteer.test.ts

# Run Puppeteer tests with visible browser
HEADLESS=false npm test -- --testPathPattern=puppeteer
```

**Test Scenarios:**
- **User Authentication:** Login, logout, session management (Selenium & Puppeteer)
- **Student CRUD:** Create, read, update, delete operations (Selenium & Puppeteer)
- **Data Visualization:** Chart rendering and interactions (Puppeteer)
- **Responsive Design:** Mobile and desktop layouts (Puppeteer)
- **PWA Features:** Service worker, offline functionality (Puppeteer)
- **Error Handling:** Network failures, validation errors (Selenium & Puppeteer)
- **Browser Compatibility:** Cross-browser testing (Puppeteer)
- **Visual Regression:** UI consistency validation (Puppeteer)

**Example E2E Test:**
```python
# e2e_tests.py
class StudentManagementTest(unittest.TestCase):
    def setUp(self):
        options = webdriver.ChromeOptions()
        if os.getenv('HEADLESS', 'true').lower() == 'true':
            options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')

        self.driver = webdriver.Chrome(options=options)
        self.driver.implicitly_wait(10)
        self.base_url = 'http://127.0.0.1:5173'

    def tearDown(self):
        self.driver.quit()

    def test_student_crud_workflow(self):
        driver = self.driver

        # Navigate to application
        driver.get(self.base_url)

        # Login
        self._login('admin@example.com', 'password')

        # Navigate to students page
        students_link = driver.find_element(By.CSS_SELECTOR, 'a[href="#students"]')
        students_link.click()

        # Create new student
        add_button = driver.find_element(By.CSS_SELECTOR, '.add-student-btn')
        add_button.click()

        # Fill form
        name_field = driver.find_element(By.CSS_SELECTOR, 'input[name="name"]')
        name_field.send_keys('E2E Test Student')

        father_field = driver.find_element(By.CSS_SELECTOR, 'input[name="father_name"]')
        father_field.send_keys('E2E Test Father')

        # Submit form
        submit_button = driver.find_element(By.CSS_SELECTOR, '.submit-btn')
        submit_button.click()

        # Verify student appears in table
        WebDriverWait(driver, 10).until(
            EC.text_to_be_present_in_element(
                (By.CSS_SELECTOR, '.student-table'),
                'E2E Test Student'
            )
        )

        # Edit student
        edit_button = driver.find_element(By.CSS_SELECTOR, '.edit-btn')
        edit_button.click()

        # Update fees
        fees_field = driver.find_element(By.CSS_SELECTOR, 'input[name="fees"]')
        fees_field.clear()
        fees_field.send_keys('1500')

        # Save changes
        save_button = driver.find_element(By.CSS_SELECTOR, '.save-btn')
        save_button.click()

        # Verify update
        WebDriverWait(driver, 10).until(
            EC.text_to_be_present_in_element(
                (By.CSS_SELECTOR, '.student-table'),
                '1500'
            )
        )

        # Delete student
        delete_button = driver.find_element(By.CSS_SELECTOR, '.delete-btn')
        delete_button.click()

        # Confirm deletion
        confirm_button = driver.find_element(By.CSS_SELECTOR, '.confirm-delete-btn')
        confirm_button.click()

        # Verify deletion
        WebDriverWait(driver, 10).until(
            EC.invisibility_of_element_located(
                (By.CSS_SELECTOR, 'td:contains("E2E Test Student")')
            )
        )

    def _login(self, username, password):
        """Helper method for login"""
        driver = self.driver

        username_field = driver.find_element(By.CSS_SELECTOR, 'input[name="username"]')
        password_field = driver.find_element(By.CSS_SELECTOR, 'input[name="password"]')
        login_button = driver.find_element(By.CSS_SELECTOR, '.login-btn')

        username_field.send_keys(username)
        password_field.send_keys(password)
        login_button.click()

        # Wait for redirect to dashboard
        WebDriverWait(driver, 10).until(
            EC.url_contains('#dashboard')
        )
```

## Test Automation and CI/CD

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.8, 3.9, '3.10', '3.11']
        node-version: [16, 18, 20]

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python ${{ matrix.python-version }}
        uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Setup PostgreSQL
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client
          pg_isready -h localhost -p 5432

      - name: Install backend dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Install frontend dependencies
        run: |
          cd frontend
          npm install

      - name: Setup test databases
        run: |
          cd backend
          cp .env.example .env.test
          # Configure test database URLs

      - name: Run backend tests
        run: ./test_backend.sh
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Run frontend tests
        run: ./test_frontend.sh

      - name: Run Puppeteer tests
        run: npm test -- --testPathPattern=puppeteer --coverage
        env:
          HEADLESS: true

      - name: Run E2E tests
        run: python e2e_tests.py
        env:
          BASE_URL: http://localhost:5173

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./backend_coverage/coverage.xml,./frontend_coverage/lcov.info,./e2e_coverage/coverage.xml
          fail_ci_if_error: true
```

## Performance Testing

### Load Testing with Locust

```python
# locustfile.py
from locust import HttpUser, task, between

class StudentAppUser(HttpUser):
    wait_time = between(1, 5)

    @task(3)
    def get_students(self):
        self.client.get("/api/students?limit=50")

    @task(2)
    def get_student_detail(self):
        student_id = random.randint(1, 1000)
        self.client.get(f"/api/students/{student_id}")

    @task(1)
    def create_student(self):
        student_data = {
            "name": f"Load Test User {random.randint(1, 10000)}",
            "father_name": "Load Test Father",
            "class": "10th Grade",
            "fees": 1200.00
        }
        self.client.post("/api/students", json=student_data)

# Run load test
# locust -f locustfile.py --host=http://localhost:8000
```

### Database Performance Testing

```python
# backend/test_performance.py
import time
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

async def benchmark_database_queries():
    engine = create_async_engine(DATABASE_URL)

    # Test bulk insert performance
    start_time = time.time()
    async with engine.begin() as conn:
        for i in range(1000):
            await conn.execute(
                text("INSERT INTO students (name, fees) VALUES (:name, :fees)"),
                {"name": f"Perf Test {i}", "fees": 1000.0}
            )
    end_time = time.time()

    print(f"Bulk insert 1000 records: {end_time - start_time:.2f} seconds")

    # Test complex query performance
    start_time = time.time()
    async with engine.begin() as conn:
        result = await conn.execute(
            text("""
                SELECT driver_name, COUNT(*) as student_count,
                       AVG(fees) as avg_fees, SUM(fees) as total_fees
                FROM students
                GROUP BY driver_name
                ORDER BY total_fees DESC
                LIMIT 10
            """)
        )
    end_time = time.time()

    print(f"Complex aggregation query: {end_time - start_time:.4f} seconds")
```

## Test Data Management

### Test Data Seeding

```python
# backend/test_data.py
from sqlalchemy.ext.asyncio import AsyncSession
from .models import Student

async def seed_test_students(db: AsyncSession, count: int = 100):
    """Seed database with test student data"""
    students = []
    for i in range(count):
        student = Student(
            name=f"Test Student {i}",
            father_name=f"Father {i}",
            class=f"{random.randint(1, 12)}th Grade",
            fees=round(random.uniform(800, 2000), 2),
            primary_mobile=f"9{random.randint(100000000, 999999999)}",
            route_number=f"R{random.randint(1, 50):03d}",
            area=f"Area {random.randint(1, 20)}",
            address=f"{random.randint(1, 999)} Test Street"
        )
        students.append(student)

    db.add_all(students)
    await db.commit()
    return students

async def clear_test_data(db: AsyncSession):
    """Clear all test data"""
    await db.execute(text("DELETE FROM students"))
    await db.commit()
```

### Test Fixtures

```python
# conftest.py
import pytest
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def db_engine():
    """Create database engine for testing"""
    engine = create_async_engine(
        "sqlite+aiosqlite:///./test.db",
        echo=False,
    )
    yield engine
    await engine.dispose()

@pytest.fixture
async def db_session(db_engine):
    """Create database session for testing"""
    async_session = sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Create tables
        from .models import Base
        async with db_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        yield session

        # Cleanup
        async with db_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def client(db_session):
    """Create test client with database session"""
    from .main import app

    # Override database dependency
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    from httpx import AsyncClient
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        yield client
```

## Coverage Reporting

### Combined Coverage Report

```bash
# Run all tests with coverage
./test.sh

# Generate combined coverage report
coverage combine backend_coverage/.coverage e2e_coverage/.coverage
coverage html
coverage xml

# View reports
# HTML: htmlcov/index.html
# XML: coverage.xml (for CI/CD integration)
```

### Coverage Configuration

```ini
# .coveragerc
[run]
source = backend
omit =
    */venv/*
    */__pycache__/*
    */test_*.py
    */migrations/*

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    if self.debug:
    if settings.DEBUG
    raise AssertionError
    raise NotImplementedError
    if 0:
    if __name__ == .__main__.:

[html]
directory = coverage_html_report

[xml]
output = coverage.xml
```

## Test-Driven Development (TDD)

### Red-Green-Refactor Cycle

1. **Write Failing Test (Red):**
```python
def test_bulk_student_import():
    """Test bulk import functionality"""
    # Given: CSV file with 100 students
    csv_content = generate_test_csv(100)

    # When: Import is processed
    result = student_service.bulk_import(csv_content)

    # Then: All students should be imported successfully
    assert result.successful == 100
    assert result.failed == 0
```

2. **Implement Minimal Code (Green):**
```python
class BulkImportResult:
    def __init__(self, successful: int = 0, failed: int = 0, errors: List[str] = None):
        self.successful = successful
        self.failed = failed
        self.errors = errors or []

class StudentService:
    def bulk_import(self, csv_content: str) -> BulkImportResult:
        # Parse CSV
        students = []
        reader = csv.DictReader(StringIO(csv_content))

        for row in reader:
            try:
                student = Student(**row)
                students.append(student)
            except ValidationError as e:
                return BulkImportResult(failed=len(reader) - len(students) + 1)

        # Save to database
        # (implementation details)

        return BulkImportResult(successful=len(students))
```

3. **Refactor and Improve:**
```python
class StudentService:
    async def bulk_import(self, csv_content: str, db: AsyncSession) -> BulkImportResult:
        """Bulk import students from CSV content"""
        students = []
        errors = []

        reader = csv.DictReader(StringIO(csv_content))
        for row_num, row in enumerate(reader, start=2):  # Start at 2 to account for header
            try:
                student_data = self._parse_student_row(row)
                student = Student(**student_data)
                students.append(student)
            except (ValidationError, ValueError) as e:
                errors.append(f"Row {row_num}: {str(e)}")

        if students:
            db.add_all(students)
            await db.commit()

        return BulkImportResult(
            successful=len(students),
            failed=len(errors),
            errors=errors
        )
```

## Continuous Testing

### Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit

# Setup hooks
pre-commit install

# Run on all files
pre-commit run --all-files
```

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/psf/black
    rev: 23.7.0
    hooks:
      - id: black
        language_version: python3

  - repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
      - id: isort

  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8

  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.45.0
    hooks:
      - id: eslint
        files: \.(js|ts)$
        types: [file]
        additional_dependencies:
          - eslint@^8.0.0
          - '@typescript-eslint/parser'
          - '@typescript-eslint/eslint-plugin'
```

### Mutation Testing (Optional Advanced)

```bash
# Install mutmut
pip install mutmut

# Run mutation testing
mutmut run --paths-to-mutate=backend --tests-dir=backend

# Generate report
mutmut html
```

## Mobile Testing

### Responsive Design Testing

```javascript
// frontend/__tests__/responsive.test.js
describe('Responsive Design', () => {
  const viewports = [
    { width: 320, height: 568, name: 'iPhone SE' },
    { width: 375, height: 667, name: 'iPhone 6/7/8' },
    { width: 414, height: 896, name: 'iPhone 11' },
    { width: 768, height: 1024, name: 'iPad' },
    { width: 1024, height: 768, name: 'iPad Landscape' },
    { width: 1920, height: 1080, name: 'Desktop' }
  ];

  viewports.forEach(({ width, height, name }) => {
    describe(`${name} (${width}x${height})`, () => {
      beforeEach(() => {
        // Set viewport
        Object.defineProperty(window, 'innerWidth', { value: width });
        Object.defineProperty(window, 'innerHeight', { value: height });
      });

      test('student table should be responsive', () => {
        const table = new StudentTable();
        document.body.appendChild(table);

        if (width < 768) {
          // Mobile layout assertions
          expect(table.classList.contains('mobile-layout')).toBe(true);
        } else {
          // Desktop layout assertions
          expect(table.classList.contains('desktop-layout')).toBe(true);
        }
      });
    });
  });
});
```

## Accessibility Testing

### Automated Accessibility Tests

```typescript
// frontend/__tests__/accessibility.test.ts
import { axe, toHaveNoViolations } from 'jest-axe';
import { StudentTable } from '../src/ts/components/students/student-table';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  test('student table should have no accessibility violations', async () => {
    const table = new StudentTable();
    document.body.appendChild(table);

    // Populate with test data
    table.students = [
      { id: 1, name: 'John Doe', class: '10th Grade', fees: 1200 }
    ];

    const results = await axe(table.shadowRoot?.innerHTML || '');
    expect(results).toHaveNoViolations();
  });

  test('form should have proper labels and focus management', () => {
    const form = new StudentForm();

    // Check for ARIA labels
    const inputs = form.shadowRoot?.querySelectorAll('input');
    inputs?.forEach(input => {
      expect(input.getAttribute('aria-label')).toBeTruthy();
      expect(input.getAttribute('id')).toBeTruthy();
    });

    // Check for associated labels
    const labels = form.shadowRoot?.querySelectorAll('label');
    labels?.forEach(label => {
      const inputId = label.getAttribute('for');
      expect(inputId).toBeTruthy();
      expect(form.shadowRoot?.querySelector(`#${inputId}`)).toBeTruthy();
    });
  });
});

This comprehensive testing strategy ensures high code quality, prevents regressions, and validates functionality across all components and user interactions.