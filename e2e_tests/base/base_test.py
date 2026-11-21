"""
Base Test Class for E2E Tests
Provides shared setup/teardown logic and common test utilities
"""

import subprocess
import time
import os
import sys
import signal
import pytest
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import coverage

# Import helper modules
from e2e_tests.helpers.api_helpers import APIClient
from e2e_tests.helpers.assertion_helpers import (
    TestAssertionError, assert_response_status, assert_response_success,
    assert_json_response, assert_student_data_structure, assert_chart_data_structure,
    assert_authentication_data, assert_performance_threshold, assert_element_visible,
    assert_text_in_element, assert_table_row_count, assert_api_response_time,
    assert_data_consistency
)
from e2e_tests.helpers.logging_helpers import TestLogger, TestDataManager, create_test_logger, log_test_step
from e2e_tests.helpers.test_data_helpers import (
    TestDataGenerator, TestDataManager as DataManager, create_test_data_generator,
    create_test_data_manager
)


class ApplicationManager:
    """Manages application lifecycle for testing"""

    def __init__(self, logger: TestLogger):
        self.logger = logger
        self.backend_process: Optional[subprocess.Popen] = None
        self.frontend_process: Optional[subprocess.Popen] = None
        self.coverage: Optional[coverage.Coverage] = None
        self.base_dir = Path(__file__).parent.parent.parent

    def start_backend(self) -> None:
        """Start the FastAPI backend server with coverage"""
        self.logger.logger.info("🚀 Starting backend server with coverage...")

        # Load environment variables from backend/.env file
        backend_env = os.environ.copy()
        env_file_path = self.base_dir / "backend" / ".env"
        if env_file_path.exists():
            from dotenv import load_dotenv
            load_dotenv(env_file_path)
            # Update backend_env with loaded environment variables
            for key, value in os.environ.items():
                backend_env[key] = value

        # Start coverage before importing/subprocess
        self.coverage = coverage.Coverage(
            source=['backend'],
            omit=['*/venv/*', '*/__pycache__/*', '*/test_*'],
            data_file=str(self.base_dir / 'e2e_coverage' / '.coverage')
        )
        self.coverage.start()

        # Seed users before starting server
        self.logger.logger.info("Seeding test users...")
        try:
            seed_process = subprocess.run(
                ["python", "seed_users.py"],
                cwd=self.base_dir / "backend",
                capture_output=True,
                text=True,
                env=backend_env,
                timeout=30
            )
            if seed_process.returncode != 0:
                self.logger.logger.warning(f"Seeding failed: {seed_process.stderr}")
            else:
                self.logger.logger.info("✓ Test users seeded")
        except subprocess.TimeoutExpired:
            self.logger.logger.warning("User seeding timed out")
        except FileNotFoundError:
            self.logger.logger.warning("seed_users.py not found, skipping seeding")

        try:
            self.backend_process = subprocess.Popen(
                ["uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
                cwd=self.base_dir / "backend",
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=backend_env
            )

            # Wait for server to start
            if not self._wait_for_backend():
                raise RuntimeError("Backend server failed to start")

        except Exception as e:
            self.logger.logger.error(f"Failed to start backend: {e}")
            raise

    def start_frontend(self) -> None:
        """Start the frontend server"""
        self.logger.logger.info("🚀 Starting frontend server...")

        try:
            self.frontend_process = subprocess.Popen(
                ["python", "-m", "http.server", "5173"],
                cwd=self.base_dir / "frontend",
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )

            # Wait for server to start
            time.sleep(2)

            # Basic connectivity check
            import requests
            for attempt in range(5):
                try:
                    response = requests.get("http://127.0.0.1:5173", timeout=5)
                    if response.status_code == 200:
                        self.logger.logger.info("✓ Frontend server is running")
                        return
                except Exception:
                    time.sleep(1)

            self.logger.logger.warning("Frontend server may not be fully ready")

        except Exception as e:
            self.logger.logger.error(f"Failed to start frontend: {e}")
            raise

    def _wait_for_backend(self, max_wait: int = 30) -> bool:
        """Wait for backend to be ready"""
        import requests

        start_time = time.time()
        while time.time() - start_time < max_wait:
            try:
                response = requests.get("http://127.0.0.1:8000/api/health", timeout=5)
                if response.status_code == 200:
                    return True
            except Exception:
                pass

            time.sleep(1)

        return False

    def stop_application(self) -> None:
        """Stop both backend and frontend servers and save coverage"""
        self.logger.logger.info("⏹️  Stopping application servers...")

        # Stop coverage and save report
        if self.coverage:
            try:
                self.coverage.stop()
                self.coverage.save()

                # Generate coverage reports
                coverage_dir = self.base_dir / 'e2e_coverage'
                coverage_dir.mkdir(exist_ok=True)

                self.coverage.html_report(directory=str(coverage_dir / 'htmlcov'))
                self.coverage.xml_report(outfile=str(coverage_dir / 'coverage.xml'))
                self.logger.logger.info("✓ Coverage report saved")
            except Exception as e:
                self.logger.logger.error(f"Failed to save coverage: {e}")

        # Stop backend process
        if self.backend_process:
            try:
                self.backend_process.terminate()
                self.backend_process.wait(timeout=10)
                self.logger.logger.info("✓ Backend server stopped")
            except subprocess.TimeoutExpired:
                self.backend_process.kill()
                self.logger.logger.info("✓ Backend server force killed")
            except Exception as e:
                self.logger.logger.error(f"Error stopping backend: {e}")

        # Stop frontend process
        if self.frontend_process:
            try:
                self.frontend_process.terminate()
                self.frontend_process.wait(timeout=10)
                self.logger.logger.info("✓ Frontend server stopped")
            except subprocess.TimeoutExpired:
                self.frontend_process.kill()
                self.logger.logger.info("✓ Frontend server force killed")
            except Exception as e:
                self.logger.logger.error(f"Error stopping frontend: {e}")


class BaseE2ETest:
    """
    Base class for all E2E tests with shared setup/teardown logic

    Provides:
    - Application lifecycle management
    - Test logging and metrics
    - API client for requests
    - Test data management
    - Common assertion methods
    """

    def __init__(self):
        # Initialize test session logger
        self.test_logger = create_test_logger()

        # Initialize application manager
        self.app_manager = ApplicationManager(self.test_logger)

        # Initialize API client
        self.api_client = APIClient()

        # Initialize test data management
        self.test_data = create_test_data_manager(self.test_logger)

        # Test configuration
        self.test_config = TestConfig()

        # Track test resources for cleanup
        self.created_students: List[Dict[str, Any]] = []
        self.created_users: List[Dict[str, Any]] = []

    def setup_method(self, method) -> None:
        """Setup method called before each test"""
        test_name = method.__name__
        self.test_logger.start_test(test_name)

        # Start application if not already running
        try:
            # Check if backend is already running
            try:
                response = self.api_client.get("/api/health")
                if response.status_code == 200:
                    self.test_logger.logger.info("✓ Backend server already running")
                else:
                    self.app_manager.start_backend()
            except Exception:
                self.app_manager.start_backend()

            # Check if frontend is already running
            try:
                import requests
                response = requests.get("http://127.0.0.1:5173", timeout=5)
                if response.status_code == 200:
                    self.test_logger.logger.info("✓ Frontend server already running")
                else:
                    self.app_manager.start_frontend()
            except Exception:
                self.app_manager.start_frontend()

            # Verify servers are running
            self._verify_application_ready()

        except Exception as e:
            self.test_logger.log_error_with_context(e, {'test': test_name, 'phase': 'setup'})
            raise

    def teardown_method(self, method) -> None:
        """Teardown method called after each test"""
        test_name = method.__name__

        try:
            # Cleanup test data
            self._cleanup_test_data()

            # Stop application
            self.app_manager.stop_application()

        except Exception as e:
            self.test_logger.log_error_with_context(e, {'test': test_name, 'phase': 'teardown'})

        finally:
            # Always end test tracking
            status = "passed"  # Will be overridden by pytest if test failed
            self.test_logger.end_test(status)

    def _verify_application_ready(self) -> None:
        """Verify that application is ready for testing"""
        try:
            # Check backend health
            response = self.api_client.get("/api/health")
            assert_response_status(response, 200, "backend health check")

            # Check frontend connectivity (basic)
            import requests
            response = requests.get("http://127.0.0.1:5173", timeout=5)
            if response.status_code != 200:
                self.test_logger.logger.warning("Frontend may not be fully accessible")

        except Exception as e:
            raise RuntimeError(f"Application not ready: {e}")

    def _cleanup_test_data(self) -> None:
        """Clean up test data created during the test"""
        # Cleanup students
        for student in self.created_students:
            try:
                if 'id' in student:
                    self.api_client.delete(f"/api/students/{student['id']}/")
            except Exception as e:
                self.test_logger.logger.warning(f"Failed to cleanup student {student.get('id')}: {e}")

        # Cleanup users (if needed)
        for user in self.created_users:
            try:
                if 'id' in user:
                    # Implement user cleanup if needed
                    pass
            except Exception as e:
                self.test_logger.logger.warning(f"Failed to cleanup user {user.get('id')}: {e}")

        # Clear tracking lists
        self.created_students.clear()
        self.created_users.clear()

        # Run comprehensive cleanup
        self.test_data.cleanup_all()

    def create_test_student(self, custom_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create a test student and register for cleanup"""
        from ..helpers.api_helpers import create_test_student

        student_data = custom_data or {
            'name': f'Test_{int(time.time())}_{id(self)}',
            'father_name': 'Test Father',
            'class': '5',
            'mobile': '1234567890',
            'route': 'TEST',
            'address': 'Test Address',
            'fees': '1000'
        }

        student = create_test_student(self.api_client, student_data)
        self.created_students.append(student)
        self.test_data.register_student(student)

        return student

    def create_multiple_test_students(self, count: int = 3) -> List[Dict[str, Any]]:
        """Create multiple test students"""
        students = []
        for _ in range(count):
            student = self.create_test_student()
            students.append(student)
        return students

    def login_as_dev_user(self) -> Dict[str, Any]:
        """Login as development user"""
        success, data = self.api_client.login('dev_user', 'dev_password_123')
        if not success:
            raise RuntimeError("Failed to login as dev user")
        return data

    def create_guest_user(self) -> Dict[str, Any]:
        """Create guest user session"""
        success, data = self.api_client.create_guest_user()
        if not success:
            raise RuntimeError("Failed to create guest user")
        return data

    def measure_performance(self, operation_name: str):
        """Context manager for measuring operation performance"""
        return PerformanceMeasurer(self.test_logger, operation_name)

    def take_screenshot(self, driver, name: str) -> str:
        """Take screenshot for debugging"""
        return self.test_logger.take_screenshot(driver, name)

    def log_api_call(self, method: str, endpoint: str, **kwargs) -> None:
        """Log API call for debugging"""
        import requests
        start_time = time.time()

        try:
            response = requests.request(method, f"http://127.0.0.1:8000{endpoint}", **kwargs)
            duration = time.time() - start_time

            self.test_logger.log_api_call(method, endpoint, response.status_code, duration)
            return response
        except Exception as e:
            duration = time.time() - start_time
            self.test_logger.log_api_call(method, endpoint, None, duration)
            raise


class PerformanceMeasurer:
    """Context manager for measuring operation performance"""

    def __init__(self, logger: TestLogger, operation_name: str):
        self.logger = logger
        self.operation_name = operation_name
        self.start_time: Optional[float] = None

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            duration = time.time() - self.start_time

            if exc_type:
                self.logger.logger.error(
                    f"❌ {self.operation_name} failed after {duration:.3f}s"
                )
            else:
                self.logger.logger.debug(
                    f"✓ {self.operation_name} completed in {duration:.3f}s"
                )

                # Log performance warning if too slow
                if duration > 5.0:  # 5 second threshold
                    self.logger.log_performance_warning(self.operation_name, duration, 5.0)


class TestConfig:
    """Configuration management for different test environments"""

    def __init__(self):
        self.base_url = "http://127.0.0.1:8000"
        self.frontend_url = "http://127.0.0.1:5173"
        self.test_timeout = 30
        self.api_timeout = 10
        self.browser_wait_timeout = 10

        # Performance thresholds
        self.performance_thresholds = {
            'page_load': 10.0,
            'api_call': 2.0,
            'ui_interaction': 1.0
        }

        # Test data settings
        self.default_test_student_count = 3
        self.max_cleanup_retries = 3

    def get_threshold(self, operation: str) -> float:
        """Get performance threshold for operation"""
        return self.performance_thresholds.get(operation, 5.0)


# Pytest fixtures for easy integration
@pytest.fixture(scope="function")
def e2e_test_base():
    """Pytest fixture providing BaseE2ETest instance"""
    test_base = BaseE2ETest()
    yield test_base

    # Ensure cleanup happens even if test fails
    try:
        test_base._cleanup_test_data()
        test_base.app_manager.stop_application()
    except Exception:
        pass  # Cleanup errors shouldn't fail the test framework


@pytest.fixture(scope="function")
def api_client():
    """Pytest fixture providing configured API client"""
    client = APIClient()
    yield client


@pytest.fixture(scope="function")
def test_logger():
    """Pytest fixture providing test logger"""
    logger = create_test_logger()
    yield logger


def pytest_configure(config):
    """Configure pytest with custom markers and settings"""
    # Add custom markers for test categorization
    config.addinivalue_line("markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')")
    config.addinivalue_line("markers", "integration: marks tests as integration tests")
    config.addinivalue_line("markers", "ui: marks tests as UI tests")
    config.addinivalue_line("markers", "api: marks tests as API tests")


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers automatically"""
    for item in items:
        # Add integration marker to all tests in e2e_tests directory
        if 'e2e_tests' in str(item.fspath):
            item.add_marker(pytest.mark.integration)

        # Add api marker if test name contains 'api'
        if 'api' in item.name.lower():
            item.add_marker(pytest.mark.api)

        # Add ui marker if test name contains 'ui'
        if 'ui' in item.name.lower():
            item.add_marker(pytest.mark.ui)

        # Add slow marker for performance tests
        if 'performance' in item.name.lower():
            item.add_marker(pytest.mark.slow)