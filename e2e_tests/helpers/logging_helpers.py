"""
Logging Helper Functions for E2E Tests
Provides enhanced logging and test reporting capabilities
"""

import logging
import json
import time
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict


@dataclass
class TestMetrics:
    """Data class for test performance metrics"""
    test_name: str
    start_time: float
    end_time: Optional[float] = None
    duration: Optional[float] = None
    status: str = "running"  # running, passed, failed, skipped
    error_message: Optional[str] = None
    api_calls: int = 0
    assertions: int = 0
    screenshots: int = 0

    def finish(self, status: str = "completed", error_message: Optional[str] = None):
        """Mark test as finished and calculate duration"""
        self.end_time = time.time()
        self.duration = self.end_time - self.start_time
        self.status = status
        if error_message:
            self.error_message = error_message

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return asdict(self)


class TestLogger:
    """Enhanced test logger with structured logging and metrics collection"""

    def __init__(self, test_session_name: str, log_dir: str = "test_reports"):
        self.test_session_name = test_session_name
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)

        # Setup logging
        self.logger = self._setup_logger()

        # Test metrics tracking
        self.test_metrics: List[TestMetrics] = []
        self.current_test: Optional[TestMetrics] = None

        # Counters
        self.api_call_count = 0
        self.assertion_count = 0
        self.screenshot_count = 0

    def _setup_logger(self) -> logging.Logger:
        """Setup structured logger with file and console output"""
        logger = logging.getLogger(f"test_logger_{self.test_session_name}")
        logger.setLevel(logging.DEBUG)

        # Remove existing handlers to avoid duplicates
        logger.handlers = []

        # Create formatters
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_formatter = logging.Formatter(
            '%(levelname)s: %(message)s'
        )

        # File handler for detailed logs
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = self.log_dir / f"test_session_{timestamp}.log"
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(file_formatter)

        # Console handler for important messages
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(console_formatter)

        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

        return logger

    def start_test(self, test_name: str) -> None:
        """Start tracking a test with metrics collection"""
        self.current_test = TestMetrics(
            test_name=test_name,
            start_time=time.time()
        )
        self.test_metrics.append(self.current_test)

        self.logger.info(f"🚀 Starting test: {test_name}")
        self._reset_counters()

    def end_test(self, status: str = "completed", error_message: Optional[str] = None) -> None:
        """End current test and record final metrics"""
        if not self.current_test:
            return

        self.current_test.finish(status, error_message)
        self.current_test.api_calls = self.api_call_count
        self.current_test.assertions = self.assertion_count
        self.current_test.screenshots = self.screenshot_count

        if status == "passed":
            self.logger.info(f"✅ Test passed: {self.current_test.test_name} ({self.current_test.duration:.3f}s)")
        elif status == "failed":
            self.logger.error(f"❌ Test failed: {self.current_test.test_name} - {error_message}")
        elif status == "skipped":
            self.logger.warning(f"⏭️  Test skipped: {self.current_test.test_name}")

        self.current_test = None

    def log_api_call(self, method: str, endpoint: str, status_code: Optional[int] = None,
                    duration: Optional[float] = None) -> None:
        """Log API call details"""
        self.api_call_count += 1

        message = f"📡 API {method} {endpoint}"
        if status_code:
            message += f" -> {status_code}"
        if duration:
            message += f" ({duration:.3f}s)"
    
            self.logger.debug(message)

    def log_assertion(self, assertion_type: str, description: str, passed: bool = True) -> None:
        """Log assertion results"""
        self.assertion_count += 1

        if passed:
            self.logger.debug(f"✓ Assertion passed: {assertion_type} - {description}")
        else:
            self.logger.warning(f"✗ Assertion failed: {assertion_type} - {description}")

    def log_performance_warning(self, operation: str, duration: float, threshold: float) -> None:
        """Log performance warnings"""
        self.logger.warning(
            f"⚠️  Performance warning: {operation} took {duration:.3f}s "
            f"exceeds threshold of {threshold:.3f}s"
        )

    def log_error_with_context(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> None:
        """Log error with additional context"""
        context_msg = ""
        if context:
            context_msg = f" Context: {json.dumps(context, indent=2)}"

        self.logger.error(f"💥 Error occurred: {str(error)}{context_msg}")

    def take_screenshot(self, driver, screenshot_name: str) -> str:
        """Take screenshot for debugging"""
        self.screenshot_count += 1

        timestamp = datetime.now().strftime("%H%M%S")
        screenshot_path = self.log_dir / f"{screenshot_name}_{timestamp}.png"

        try:
            driver.save_screenshot(str(screenshot_path))
            self.logger.debug(f"📸 Screenshot saved: {screenshot_path}")
            return str(screenshot_path)
        except Exception as e:
            self.logger.error(f"Failed to save screenshot: {e}")
            return ""

    def log_test_data(self, operation: str, data: Dict[str, Any]) -> None:
        """Log test data for debugging"""
        # Truncate large data for readability
        if len(str(data)) > 500:
            data_summary = f"{str(data)[:500]}... (truncated)"
        else:
            data_summary = str(data)

        self.logger.debug(f"📊 Test data {operation}: {data_summary}")

    def generate_test_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        total_tests = len(self.test_metrics)
        passed_tests = len([m for m in self.test_metrics if m.status == "passed"])
        failed_tests = len([m for m in self.test_metrics if m.status == "failed"])
        skipped_tests = len([m for m in self.test_metrics if m.status == "skipped"])

        # Calculate totals
        total_duration = sum(m.duration for m in self.test_metrics if m.duration)
        total_api_calls = sum(m.api_calls for m in self.test_metrics)
        total_assertions = sum(m.assertions for m in self.test_metrics)
        total_screenshots = sum(m.screenshots for m in self.test_metrics)

        report = {
            'session_name': self.test_session_name,
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_tests': total_tests,
                'passed': passed_tests,
                'failed': failed_tests,
                'skipped': skipped_tests,
                'success_rate': (passed_tests / total_tests * 100) if total_tests > 0 else 0,
                'total_duration': total_duration,
                'total_api_calls': total_api_calls,
                'total_assertions': total_assertions,
                'total_screenshots': total_screenshots
            },
            'tests': [metric.to_dict() for metric in self.test_metrics]
        }

        # Save report to file
        report_file = self.log_dir / f"test_report_{int(time.time())}.json"
        try:
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2)
            self.logger.info(f"📋 Test report saved: {report_file}")
        except Exception as e:
            self.logger.error(f"Failed to save test report: {e}")

        return report

    def _reset_counters(self) -> None:
        """Reset internal counters"""
        self.api_call_count = 0
        self.assertion_count = 0
        self.screenshot_count = 0


class TestDataManager:
    """Manages test data creation, cleanup, and state"""

    def __init__(self, logger: TestLogger):
        self.logger = logger
        self.created_data: Dict[str, List[Dict[str, Any]]] = {
            'students': [],
            'users': [],
            'guest_users': []
        }
        self.cleanup_functions: List[callable] = []

    def register_created_student(self, student_data: Dict[str, Any]) -> None:
        """Register created student for cleanup"""
        self.created_data['students'].append(student_data)
        self.logger.log_test_data("student_created", student_data)

    def register_created_user(self, user_data: Dict[str, Any]) -> None:
        """Register created user for cleanup"""
        self.created_data['users'].append(user_data)
        self.logger.log_test_data("user_created", user_data)

    def register_created_guest(self, guest_data: Dict[str, Any]) -> None:
        """Register created guest user for cleanup"""
        self.created_data['guest_users'].append(guest_data)
        self.logger.log_test_data("guest_created", guest_data)

    def register_cleanup_function(self, cleanup_func: callable) -> None:
        """Register a cleanup function to be called at test end"""
        self.cleanup_functions.append(cleanup_func)

    def cleanup_all(self) -> None:
        """Clean up all registered test data"""
        self.logger.logger.info("🧹 Starting test data cleanup...")

        # Run custom cleanup functions first
        for cleanup_func in self.cleanup_functions:
            try:
                cleanup_func()
            except Exception as e:
                self.logger.logger.error(f"Cleanup function failed: {e}")

        # Clear registered data
        for data_type, data_list in self.created_data.items():
            self.logger.logger.debug(f"Cleaned up {len(data_list)} {data_type}")

        self.created_data = {key: [] for key in self.created_data.keys()}
        self.cleanup_functions = []

        self.logger.logger.info("✓ Test data cleanup completed")


def create_test_logger(test_session_name: str = None) -> TestLogger:
    """Factory function to create test logger with session name"""
    if not test_session_name:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        test_session_name = f"test_session_{timestamp}"

    return TestLogger(test_session_name)


def log_test_step(logger: TestLogger, step_description: str, data: Optional[Dict] = None) -> None:
    """Log a test step with optional data"""
    logger.logger.info(f"📌 Test step: {step_description}")
    if data:
        logger.log_test_data(step_description, data)