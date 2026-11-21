# E2E Test Framework

A comprehensive, maintainable, and modular End-to-End testing framework for the Student Profiles PWA.

## 🚀 Overview

This restructured E2E test framework provides a robust foundation for testing the complete application stack including:

- **Student CRUD Operations** - Create, Read, Update, Delete functionality (Selenium & Puppeteer)
- **Authentication & Authorization** - Login, logout, token management, RBAC (Selenium & Puppeteer)
- **Search & Filtering** - Data search and filtering capabilities (Selenium & Puppeteer)
- **Charts & Visualizations** - Chart data integrity and display (Puppeteer)
- **Accessibility** - ARIA labels, keyboard navigation, responsive design (Puppeteer)
- **Performance** - Load times, API response times, UI interactions (Selenium & Puppeteer)
- **Error Handling** - Network failures, API errors, recovery scenarios (Selenium & Puppeteer)
- **Browser Compatibility** - Cross-browser testing with real Chrome (Version 141.0.7390.107)

## 📁 Project Structure

```
e2e_tests/
├── __init__.py                 # Package initialization and exports
├── run_tests.py               # Main test runner script
├── README.md                  # This file
├── base/
│   └── base_test.py           # Base test class with shared functionality
├── config/
│   └── test_config.py         # Configuration management for different environments
├── helpers/
│   ├── api_helpers.py         # API client and authentication utilities
│   ├── assertion_helpers.py   # Enhanced assertion functions
│   ├── logging_helpers.py     # Test logging and reporting
│   └── test_data_helpers.py   # Test data generation and management
└── tests/
    ├── test_student_crud.py   # Student CRUD operation tests (Selenium)
    ├── test_authentication.py # Authentication and authorization tests (Selenium)
    └── [future test files]    # Additional test suites

# Puppeteer E2E Tests (Frontend)
frontend/__tests__/
├── navigation-puppeteer.test.ts    # Navigation and routing tests
├── authentication-puppeteer.test.ts # Login/logout with real browser
├── responsive-puppeteer.test.ts     # Mobile/desktop layout tests
└── [future puppeteer tests]        # Additional Puppeteer test suites
```

## ✨ Key Features

### 🔧 **Modular Architecture**
- **Separation of Concerns**: Each component has a single responsibility
- **Reusable Components**: Shared utilities across all test suites
- **Extensible Design**: Easy to add new test suites and functionality

### 🛠️ **Enhanced Test Utilities**
- **API Client**: Robust HTTP client with authentication support
- **Assertion Helpers**: Detailed assertion functions with enhanced error messages
- **Test Data Management**: Automated creation and cleanup of test data
- **Performance Monitoring**: Built-in performance measurement and thresholds

### 📊 **Advanced Logging & Reporting**
- **Structured Logging**: Detailed logs with context and metrics
- **Test Metrics**: Performance tracking and success rate calculation
- **Screenshot Capture**: Automatic screenshots on failures
- **HTML Reports**: Coverage and test execution reports

### ⚙️ **Configuration Management**
- **Environment Support**: Development, staging, production, CI configurations
- **Flexible Settings**: Customizable timeouts, thresholds, and behaviors
- **Environment Variables**: Override settings via environment variables

### 🧹 **Better Test Data Management**
- **Automated Cleanup**: Ensures clean test environment
- **Data Generation**: Realistic test data creation
- **Edge Cases**: Built-in edge case data templates

## 🚦 Quick Start

### Prerequisites

- Python 3.8+
- pytest
- selenium
- requests
- python-dotenv

### Installation

1. **Install dependencies**:
   ```bash
   pip install pytest selenium requests python-dotenv coverage
   ```

2. **Install browser drivers** (choose based on your browser):
   ```bash
   # For Chrome
   pip install webdriver-manager
   # OR manually install ChromeDriver

   # For Firefox
   pip install geckodriver-autoinstaller
   ```

### Running Tests

#### Run All Tests
```bash
# Run Selenium E2E tests
python e2e_tests/run_tests.py

# Run Puppeteer E2E tests
npm test -- --testPathPattern=puppeteer
```

#### Run Specific Test Suite
```bash
# Selenium test suites
python e2e_tests/run_tests.py --suite student_crud
python e2e_tests/run_tests.py --suite authentication

# Puppeteer test suites
npm test -- navigation-puppeteer.test.ts
npm test -- authentication-puppeteer.test.ts
```

#### Run with Different Environment
```bash
python e2e_tests/run_tests.py --environment ci
python e2e_tests/run_tests.py --environment production
```

#### Run with Custom Configuration
```bash
python e2e_tests/run_tests.py --config-file custom_config.json
```

#### Dry Run (Preview Mode)
```bash
python e2e_tests/run_tests.py --dry-run
```

### Using Pytest Directly (Selenium Tests)

You can run Selenium-based tests using pytest:

```bash
# Run all Selenium tests
pytest e2e_tests/tests/

# Run specific test file
pytest e2e_tests/tests/test_student_crud.py

# Run with verbose output
pytest e2e_tests/tests/ -v

# Run with coverage
pytest e2e_tests/tests/ --cov=e2e_tests --cov-report=html
```

### Using Jest for Puppeteer Tests

For Puppeteer-based E2E tests, use Jest:

```bash
# Run all Puppeteer tests
npm test -- --testPathPattern=puppeteer

# Run specific Puppeteer test file
npm test -- navigation-puppeteer.test.ts

# Run with coverage
npm run test:coverage -- --testPathPattern=puppeteer

# Debug with visible browser
HEADLESS=false npm test -- --testPathPattern=puppeteer
```

## 📖 Usage Examples

### Basic Test Class

#### Selenium-based Tests (Python)
```python
from e2e_tests import BaseE2ETest

class TestMyFeature(BaseE2ETest):
    """Example Selenium test class inheriting from BaseE2ETest"""

    def test_my_feature(self):
        """Test my feature functionality"""
        # Login as test user
        login_data = self.login_as_dev_user()

        # Create test data
        student = self.create_test_student({
            'name': 'Test Student',
            'class': '10'
        })

        # Perform assertions
        response = self.api_client.get(f"/api/students/{student['id']}/")
        assert response.status_code == 200

        # Test data is automatically cleaned up
```

#### Puppeteer-based Tests (TypeScript)
```typescript
// frontend/__tests__/my-feature-puppeteer.test.ts
import 'jest-puppeteer';

describe('My Feature Puppeteer Tests', () => {
    beforeAll(async () => {
        await page.goto('http://localhost:5173');
    });

    test('should test my feature in real browser', async () => {
        // Navigate to feature page
        await page.click('a[data-page="my-feature"]');
        await page.waitForSelector('#my-feature-page');

        // Interact with elements
        await page.type('input[name="test-input"]', 'Test Value');
        await page.click('button[type="submit"]');

        // Verify results
        await page.waitForSelector('.success-message');
        const message = await page.$eval('.success-message', (el: HTMLElement) => el.textContent);
        expect(message).toContain('Success');
    });
});
```

### Using Test Utilities

```python
from e2e_tests import (
    APIClient, assert_response_success, create_test_logger,
    TestDataGenerator
)

# Create API client
client = APIClient(base_url="http://localhost:8000")

# Create test logger
logger = create_test_logger("my_test_session")

# Generate test data
data_gen = TestDataGenerator(logger)
student_data = data_gen.create_student_data(count=5)

# Make authenticated requests
success, login_data = client.login("username", "password")
if success:
    response = client.get("/api/protected-endpoint")
    assert_response_success(response, "protected endpoint")
```

### Configuration Management

```python
from e2e_tests import get_config, TestConfiguration, TestEnvironment

# Get current configuration
config = get_config()

# Create custom configuration
custom_config = TestConfiguration(
    environment=TestEnvironment.DEVELOPMENT,
    server=ServerConfig(
        backend_host="127.0.0.1",
        backend_port=8000
    ),
    performance=PerformanceConfig(
        max_api_response_time=1.0,
        enable_performance_monitoring=True
    )
)

# Save configuration to file
custom_config.save_to_file("my_config.json")

# Load configuration from file
loaded_config = TestConfiguration.load_from_file("my_config.json")
```

## 🔧 Configuration

### Environment Variables

The framework supports configuration via environment variables:

```bash
# Server configuration
export BACKEND_HOST=127.0.0.1
export BACKEND_PORT=8000
export FRONTEND_HOST=127.0.0.1
export FRONTEND_PORT=5173

# Test environment
export TEST_ENVIRONMENT=development

# Browser configuration
export BROWSER_HEADLESS=true
export BROWSER_TYPE=chrome

# Performance thresholds
export MAX_PAGE_LOAD_TIME=10.0
export MAX_API_RESPONSE_TIME=2.0

# Parallel execution
export PARALLEL_EXECUTION=true
export MAX_WORKERS=4

# Logging
export LOG_LEVEL=INFO
export LOG_DIRECTORY=test_reports
```

### Configuration File

Create a JSON configuration file:

```json
{
  "environment": "development",
  "server": {
    "backend_host": "127.0.0.1",
    "backend_port": 8000,
    "frontend_host": "127.0.0.1",
    "frontend_port": 5173
  },
  "browser": {
    "headless": true,
    "browser_type": "chrome",
    "window_size": [1920, 1080]
  },
  "performance": {
    "max_api_response_time": 2.0,
    "enable_performance_monitoring": true
  },
  "logging": {
    "log_level": "INFO",
    "log_directory": "test_reports"
  }
}
```

## 📊 Test Reporting

The framework generates comprehensive test reports:

### Coverage Reports
- **HTML Coverage Report**: `e2e_coverage/htmlcov/index.html`
- **XML Coverage Report**: `e2e_coverage/coverage.xml`
- **JSON Test Reports**: `test_reports/test_report_*.json`

### Log Files
- **Session Logs**: `test_reports/test_session_*.log`
- **Screenshots**: `test_reports/*.png` (on failures)

### Report Structure

```json
{
  "session_name": "e2e_test_runner_all",
  "timestamp": "2025-10-20T09:15:23.502Z",
  "summary": {
    "total_tests": 10,
    "passed": 8,
    "failed": 1,
    "skipped": 1,
    "success_rate": 80.0,
    "total_duration": 45.67,
    "total_api_calls": 156,
    "total_assertions": 89,
    "total_screenshots": 2
  },
  "tests": [...]
}
```

## 🎯 Best Practices

### Test Organization
- **One Feature per Test File**: Keep test files focused on specific functionality
- **Descriptive Test Names**: Use clear, descriptive test method names
- **Arrange-Act-Assert Pattern**: Structure tests clearly

### Data Management
- **Use Test Data Helpers**: Generate realistic test data automatically
- **Automatic Cleanup**: Rely on framework cleanup rather than manual cleanup
- **Isolated Tests**: Ensure tests don't depend on each other's data

### Error Handling
- **Detailed Assertions**: Use assertion helpers for better error messages
- **Screenshot on Failure**: Enable screenshots for UI test failures
- **Proper Logging**: Use structured logging for debugging

### Performance
- **Performance Monitoring**: Use built-in performance measurement
- **Threshold Configuration**: Set appropriate performance thresholds
- **Resource Cleanup**: Ensure proper cleanup of test resources

## 🔍 Debugging

### Enable Verbose Logging
```bash
python e2e_tests/run_tests.py --verbose
```

### Run Specific Test with Debugging
```bash
python -m pytest e2e_tests/tests/test_student_crud.py::TestStudentCRUD::test_create_student_e2e -v -s
```

### Check Test Reports
```bash
# View HTML coverage report
open e2e_coverage/htmlcov/index.html

# Check recent logs
tail -f test_reports/test_session_*.log
```

## 🤝 Contributing

### Adding New Test Suites

1. **Create Test File** in `e2e_tests/tests/`:
   ```python
   from ..base.base_test import BaseE2ETest

   class TestNewFeature(BaseE2ETest):
       def test_new_functionality(self):
           # Test implementation
           pass
   ```

2. **Update Test Runner** in `run_tests.py`:
   ```python
   def run_specific_test_suite(suite_name: str, config: TestConfiguration, logger) -> bool:
       if suite_name == "new_feature":
           from tests.test_new_feature import TestNewFeature
           suite = TestNewFeature()
   ```

3. **Add Documentation** in this README

### Adding New Helpers

1. **Create Helper Module** in `e2e_tests/helpers/`:
   ```python
   def new_helper_function():
       # Helper implementation
       pass
   ```

2. **Export in `__init__.py`**:
   ```python
   from .helpers.new_helper_module import new_helper_function
   __all__ = [..., 'new_helper_function']
   ```

## 📋 Migration from Original Tests

### Before (Original Structure)
```python
# All tests in one large file
class TestE2EStudentCRUD:
    @pytest.fixture
    def setup_app_and_browser(self):
        # Duplicated setup code
        pass

    def test_create_student_e2e(self, setup_app_and_browser):
        # Mixed API and UI testing
        # Manual cleanup
        pass
```

### After (Restructured)
```python
# Organized in separate files
class TestStudentCRUD(BaseE2ETest):
    def test_create_student_e2e(self):
        # Uses shared base class
        # Automatic cleanup
        # Better error messages
        pass
```

### Migration Steps

1. **Extract Test Classes**: Move each test class to separate files
2. **Inherit Base Class**: Make test classes inherit from `BaseE2ETest`
3. **Use Helper Functions**: Replace manual API calls with helper functions
4. **Remove Duplicated Code**: Delete duplicated setup/teardown code
5. **Update Imports**: Use the new package structure

## 🎉 Benefits of Restructured Framework

- **🔧 Maintainability**: Modular design makes updates easier
- **♻️ Reusability**: Shared components across all tests
- **📊 Better Reporting**: Enhanced logging and metrics
- **⚡ Performance**: Built-in performance monitoring
- **🛡️ Reliability**: Better error handling and cleanup
- **🔍 Debuggability**: Enhanced error messages and screenshots
- **⚙️ Flexibility**: Environment-specific configurations
- **📈 Scalability**: Easy to add new test suites
- **🌐 Dual Testing**: Both Selenium (Python) and Puppeteer (JavaScript) support
- **🔍 Real Browser Testing**: Puppeteer provides actual Chrome browser testing
- **📱 Cross-Platform**: Comprehensive browser compatibility validation

## 📞 Support

For issues, questions, or contributions:

1. **Check Documentation**: Review this README and inline comments
2. **Review Examples**: Look at existing test files for patterns
3. **Enable Debug Logging**: Use `--verbose` flag for detailed logs
4. **Check Test Reports**: Analyze generated reports for insights

---

**Happy Testing! 🚀**