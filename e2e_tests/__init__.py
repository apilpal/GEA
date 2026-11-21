"""
E2E Tests Package
Comprehensive End-to-End testing framework for Student Profiles PWA
"""

__version__ = "1.0.0"
__author__ = "E2E Test Framework"

from .base.base_test import BaseE2ETest, ApplicationManager, TestConfig
from .helpers.api_helpers import APIClient
from .helpers.assertion_helpers import (
    TestAssertionError, assert_response_status, assert_response_success,
    assert_json_response, assert_student_data_structure, assert_chart_data_structure,
    assert_authentication_data, assert_performance_threshold, assert_element_visible,
    assert_text_in_element, assert_table_row_count, assert_api_response_time,
    assert_data_consistency
)
from .helpers.logging_helpers import TestLogger, TestDataManager, create_test_logger, log_test_step
from .helpers.test_data_helpers import (
    TestDataGenerator, TestDataManager as DataManager, create_test_data_generator,
    create_test_data_manager, TestStudentData, TestUserData
)
from .config.test_config import (
    TestConfiguration, TestEnvironment, DatabaseConfig, ServerConfig,
    BrowserConfig, PerformanceConfig, LoggingConfig, TestExecutionConfig,
    TestDataConfig, NotificationConfig, get_config, set_config, reset_config,
    get_dev_config, get_ci_config, get_production_config
)

__all__ = [
    # Base classes
    'BaseE2ETest',
    'ApplicationManager',
    'TestConfig',

    # API helpers
    'APIClient',

    # Assertion helpers
    'TestAssertionError',
    'assert_response_status',
    'assert_response_success',
    'assert_json_response',
    'assert_student_data_structure',
    'assert_chart_data_structure',
    'assert_authentication_data',
    'assert_performance_threshold',
    'assert_element_visible',
    'assert_text_in_element',
    'assert_table_row_count',
    'assert_api_response_time',
    'assert_data_consistency',

    # Logging helpers
    'TestLogger',
    'TestDataManager',
    'create_test_logger',
    'log_test_step',

    # Test data helpers
    'TestDataGenerator',
    'DataManager',
    'create_test_data_generator',
    'create_test_data_manager',
    'TestStudentData',
    'TestUserData',

    # Configuration
    'TestConfiguration',
    'TestEnvironment',
    'DatabaseConfig',
    'ServerConfig',
    'BrowserConfig',
    'PerformanceConfig',
    'LoggingConfig',
    'TestExecutionConfig',
    'TestDataConfig',
    'NotificationConfig',
    'get_config',
    'set_config',
    'reset_config',
    'get_dev_config',
    'get_ci_config',
    'get_production_config',
]