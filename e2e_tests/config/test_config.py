"""
Test Configuration Management for Different Test Environments
Provides environment-specific settings and configuration management
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum


class TestEnvironment(Enum):
    """Test environment enumeration"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    CI = "ci"
    LOCAL = "local"


@dataclass
class DatabaseConfig:
    """Database configuration for tests"""
    host: str = "localhost"
    port: int = 5432
    name: str = "test_db"
    user: str = "test_user"
    password: str = "test_password"
    reset_before_tests: bool = True
    use_migrations: bool = False


@dataclass
class ServerConfig:
    """Server configuration for tests"""
    backend_host: str = "127.0.0.1"
    backend_port: int = 8000
    frontend_host: str = "127.0.0.1"
    frontend_port: int = 5173
    use_ssl: bool = False
    server_timeout: int = 30
    health_check_interval: int = 1


@dataclass
class BrowserConfig:
    """Browser configuration for UI tests"""
    headless: bool = True
    window_size: tuple = (1920, 1080)
    implicit_wait: int = 10
    page_load_timeout: int = 30
    script_timeout: int = 30
    browser_type: str = "chrome"  # chrome, firefox, safari
    download_directory: Optional[str] = None


@dataclass
class PerformanceConfig:
    """Performance testing configuration"""
    enable_performance_monitoring: bool = True
    max_page_load_time: float = 10.0
    max_api_response_time: float = 2.0
    max_ui_interaction_time: float = 1.0
    enable_screenshots_on_failure: bool = True
    performance_thresholds: Dict[str, float] = field(default_factory=dict)


@dataclass
class LoggingConfig:
    """Logging configuration for tests"""
    log_level: str = "INFO"
    log_directory: str = "test_reports"
    enable_console_logging: bool = True
    enable_file_logging: bool = True
    log_api_calls: bool = True
    log_performance_metrics: bool = True
    max_log_file_size: int = 10 * 1024 * 1024  # 10MB


@dataclass
class TestExecutionConfig:
    """Test execution configuration"""
    parallel_execution: bool = False
    max_workers: int = 3
    retry_failed_tests: bool = True
    max_retries: int = 2
    fail_fast: bool = False
    generate_html_report: bool = True
    generate_coverage_report: bool = True
    cleanup_after_tests: bool = True
    test_timeout: int = 300  # 5 minutes


@dataclass
class TestDataConfig:
    """Test data configuration"""
    create_sample_data: bool = True
    sample_data_count: int = 10
    cleanup_test_data: bool = True
    use_realistic_data: bool = True
    randomize_test_data: bool = True
    data_templates_directory: str = "test_data_templates"


@dataclass
class NotificationConfig:
    """Notification configuration for test results"""
    enable_notifications: bool = False
    notification_webhook: Optional[str] = None
    notify_on_failure: bool = True
    notify_on_success: bool = False
    include_screenshots: bool = True


@dataclass
class TestConfiguration:
    """Main test configuration class"""
    environment: TestEnvironment = TestEnvironment.DEVELOPMENT
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    server: ServerConfig = field(default_factory=ServerConfig)
    browser: BrowserConfig = field(default_factory=BrowserConfig)
    performance: PerformanceConfig = field(default_factory=PerformanceConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    execution: TestExecutionConfig = field(default_factory=TestExecutionConfig)
    test_data: TestDataConfig = field(default_factory=TestDataConfig)
    notifications: NotificationConfig = field(default_factory=NotificationConfig)

    # Custom environment variables
    custom_settings: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Set environment-specific defaults after initialization"""
        if self.environment == TestEnvironment.CI:
            self.browser.headless = True
            self.execution.parallel_execution = True
            self.execution.max_workers = 4
            self.logging.log_level = "WARNING"
            self.performance.enable_performance_monitoring = False
            self.notifications.enable_notifications = True

        elif self.environment == TestEnvironment.PRODUCTION:
            self.browser.headless = True
            self.execution.retry_failed_tests = True
            self.execution.max_retries = 3
            self.logging.log_level = "ERROR"
            self.notifications.enable_notifications = True
            self.notifications.notify_on_success = True

        elif self.environment == TestEnvironment.STAGING:
            self.browser.headless = True
            self.execution.retry_failed_tests = True
            self.execution.max_retries = 2
            self.logging.log_level = "INFO"
            self.performance.enable_performance_monitoring = True

    @classmethod
    def from_environment(cls) -> 'TestConfiguration':
        """Create configuration from environment variables"""
        # Determine environment
        env_name = os.getenv('TEST_ENVIRONMENT', 'development').lower()
        try:
            environment = TestEnvironment(env_name)
        except ValueError:
            environment = TestEnvironment.DEVELOPMENT

        # Create base configuration
        config = cls(environment=environment)

        # Override with environment variables
        config._apply_environment_overrides()

        return config

    def _apply_environment_overrides(self):
        """Apply overrides from environment variables"""
        # Server configuration
        if os.getenv('BACKEND_HOST'):
            self.server.backend_host = os.getenv('BACKEND_HOST')
        if os.getenv('BACKEND_PORT'):
            self.server.backend_port = int(os.getenv('BACKEND_PORT'))
        if os.getenv('FRONTEND_HOST'):
            self.server.frontend_host = os.getenv('FRONTEND_HOST')
        if os.getenv('FRONTEND_PORT'):
            self.server.frontend_port = int(os.getenv('FRONTEND_PORT'))

        # Database configuration
        if os.getenv('DB_HOST'):
            self.database.host = os.getenv('DB_HOST')
        if os.getenv('DB_PORT'):
            self.database.port = int(os.getenv('DB_PORT'))
        if os.getenv('DB_NAME'):
            self.database.name = os.getenv('DB_NAME')
        if os.getenv('DB_USER'):
            self.database.user = os.getenv('DB_USER')
        if os.getenv('DB_PASSWORD'):
            self.database.password = os.getenv('DB_PASSWORD')

        # Browser configuration
        if os.getenv('BROWSER_HEADLESS'):
            self.browser.headless = os.getenv('BROWSER_HEADLESS').lower() == 'true'
        if os.getenv('BROWSER_TYPE'):
            self.browser.browser_type = os.getenv('BROWSER_TYPE')

        # Performance configuration
        if os.getenv('MAX_PAGE_LOAD_TIME'):
            self.performance.max_page_load_time = float(os.getenv('MAX_PAGE_LOAD_TIME'))
        if os.getenv('MAX_API_RESPONSE_TIME'):
            self.performance.max_api_response_time = float(os.getenv('MAX_API_RESPONSE_TIME'))

        # Test execution
        if os.getenv('PARALLEL_EXECUTION'):
            self.execution.parallel_execution = os.getenv('PARALLEL_EXECUTION').lower() == 'true'
        if os.getenv('MAX_WORKERS'):
            self.execution.max_workers = int(os.getenv('MAX_WORKERS'))
        if os.getenv('FAIL_FAST'):
            self.execution.fail_fast = os.getenv('FAIL_FAST').lower() == 'true'

        # Logging
        if os.getenv('LOG_LEVEL'):
            self.logging.log_level = os.getenv('LOG_LEVEL')
        if os.getenv('LOG_DIRECTORY'):
            self.logging.log_directory = os.getenv('LOG_DIRECTORY')

        # Custom settings
        for key, value in os.environ.items():
            if key.startswith('TEST_'):
                setting_key = key[5:].lower()  # Remove 'TEST_' prefix
                config.custom_settings[setting_key] = value

    def save_to_file(self, file_path: str) -> None:
        """Save configuration to JSON file"""
        config_dict = {
            'environment': self.environment.value,
            'database': {
                'host': self.database.host,
                'port': self.database.port,
                'name': self.database.name,
                'user': self.database.user,
                'password': '***',  # Don't save actual password
                'reset_before_tests': self.database.reset_before_tests,
                'use_migrations': self.database.use_migrations
            },
            'server': {
                'backend_host': self.server.backend_host,
                'backend_port': self.server.backend_port,
                'frontend_host': self.server.frontend_host,
                'frontend_port': self.server.frontend_port,
                'use_ssl': self.server.use_ssl,
                'server_timeout': self.server.server_timeout,
                'health_check_interval': self.server.health_check_interval
            },
            'browser': {
                'headless': self.browser.headless,
                'window_size': self.browser.window_size,
                'implicit_wait': self.browser.implicit_wait,
                'page_load_timeout': self.browser.page_load_timeout,
                'script_timeout': self.browser.script_timeout,
                'browser_type': self.browser.browser_type,
                'download_directory': self.browser.download_directory
            },
            'performance': {
                'enable_performance_monitoring': self.performance.enable_performance_monitoring,
                'max_page_load_time': self.performance.max_page_load_time,
                'max_api_response_time': self.performance.max_api_response_time,
                'max_ui_interaction_time': self.performance.max_ui_interaction_time,
                'enable_screenshots_on_failure': self.performance.enable_screenshots_on_failure,
                'performance_thresholds': self.performance.performance_thresholds
            },
            'logging': {
                'log_level': self.logging.log_level,
                'log_directory': self.logging.log_directory,
                'enable_console_logging': self.logging.enable_console_logging,
                'enable_file_logging': self.logging.enable_file_logging,
                'log_api_calls': self.logging.log_api_calls,
                'log_performance_metrics': self.logging.log_performance_metrics,
                'max_log_file_size': self.logging.max_log_file_size
            },
            'execution': {
                'parallel_execution': self.execution.parallel_execution,
                'max_workers': self.execution.max_workers,
                'retry_failed_tests': self.execution.retry_failed_tests,
                'max_retries': self.execution.max_retries,
                'fail_fast': self.execution.fail_fast,
                'generate_html_report': self.execution.generate_html_report,
                'generate_coverage_report': self.execution.generate_coverage_report,
                'cleanup_after_tests': self.execution.cleanup_after_tests,
                'test_timeout': self.execution.test_timeout
            },
            'test_data': {
                'create_sample_data': self.test_data.create_sample_data,
                'sample_data_count': self.test_data.sample_data_count,
                'cleanup_test_data': self.test_data.cleanup_test_data,
                'use_realistic_data': self.test_data.use_realistic_data,
                'randomize_test_data': self.test_data.randomize_test_data,
                'data_templates_directory': self.test_data.data_templates_directory
            },
            'notifications': {
                'enable_notifications': self.notifications.enable_notifications,
                'notification_webhook': self.notifications.notification_webhook,
                'notify_on_failure': self.notifications.notify_on_failure,
                'notify_on_success': self.notifications.notify_on_success,
                'include_screenshots': self.notifications.include_screenshots
            },
            'custom_settings': self.custom_settings
        }

        with open(file_path, 'w') as f:
            json.dump(config_dict, f, indent=2)

    @classmethod
    def load_from_file(cls, file_path: str) -> 'TestConfiguration':
        """Load configuration from JSON file"""
        with open(file_path, 'r') as f:
            config_dict = json.load(f)

        # Create configuration object
        config = cls(environment=TestEnvironment(config_dict['environment']))

        # Apply loaded settings
        if 'database' in config_dict:
            db_config = config_dict['database']
            config.database = DatabaseConfig(
                host=db_config.get('host', 'localhost'),
                port=db_config.get('port', 5432),
                name=db_config.get('name', 'test_db'),
                user=db_config.get('user', 'test_user'),
                password=db_config.get('password', 'test_password'),
                reset_before_tests=db_config.get('reset_before_tests', True),
                use_migrations=db_config.get('use_migrations', False)
            )

        if 'server' in config_dict:
            server_config = config_dict['server']
            config.server = ServerConfig(
                backend_host=server_config.get('backend_host', '127.0.0.1'),
                backend_port=server_config.get('backend_port', 8000),
                frontend_host=server_config.get('frontend_host', '127.0.0.1'),
                frontend_port=server_config.get('frontend_port', 5173),
                use_ssl=server_config.get('use_ssl', False),
                server_timeout=server_config.get('server_timeout', 30),
                health_check_interval=server_config.get('health_check_interval', 1)
            )

        if 'browser' in config_dict:
            browser_config = config_dict['browser']
            config.browser = BrowserConfig(
                headless=browser_config.get('headless', True),
                window_size=tuple(browser_config.get('window_size', (1920, 1080))),
                implicit_wait=browser_config.get('implicit_wait', 10),
                page_load_timeout=browser_config.get('page_load_timeout', 30),
                script_timeout=browser_config.get('script_timeout', 30),
                browser_type=browser_config.get('browser_type', 'chrome'),
                download_directory=browser_config.get('download_directory')
            )

        if 'performance' in config_dict:
            perf_config = config_dict['performance']
            config.performance = PerformanceConfig(
                enable_performance_monitoring=perf_config.get('enable_performance_monitoring', True),
                max_page_load_time=perf_config.get('max_page_load_time', 10.0),
                max_api_response_time=perf_config.get('max_api_response_time', 2.0),
                max_ui_interaction_time=perf_config.get('max_ui_interaction_time', 1.0),
                enable_screenshots_on_failure=perf_config.get('enable_screenshots_on_failure', True),
                performance_thresholds=perf_config.get('performance_thresholds', {})
            )

        if 'logging' in config_dict:
            log_config = config_dict['logging']
            config.logging = LoggingConfig(
                log_level=log_config.get('log_level', 'INFO'),
                log_directory=log_config.get('log_directory', 'test_reports'),
                enable_console_logging=log_config.get('enable_console_logging', True),
                enable_file_logging=log_config.get('enable_file_logging', True),
                log_api_calls=log_config.get('log_api_calls', True),
                log_performance_metrics=log_config.get('log_performance_metrics', True),
                max_log_file_size=log_config.get('max_log_file_size', 10 * 1024 * 1024)
            )

        if 'execution' in config_dict:
            exec_config = config_dict['execution']
            config.execution = TestExecutionConfig(
                parallel_execution=exec_config.get('parallel_execution', False),
                max_workers=exec_config.get('max_workers', 3),
                retry_failed_tests=exec_config.get('retry_failed_tests', True),
                max_retries=exec_config.get('max_retries', 2),
                fail_fast=exec_config.get('fail_fast', False),
                generate_html_report=exec_config.get('generate_html_report', True),
                generate_coverage_report=exec_config.get('generate_coverage_report', True),
                cleanup_after_tests=exec_config.get('cleanup_after_tests', True),
                test_timeout=exec_config.get('test_timeout', 300)
            )

        if 'test_data' in config_dict:
            data_config = config_dict['test_data']
            config.test_data = TestDataConfig(
                create_sample_data=data_config.get('create_sample_data', True),
                sample_data_count=data_config.get('sample_data_count', 10),
                cleanup_test_data=data_config.get('cleanup_test_data', True),
                use_realistic_data=data_config.get('use_realistic_data', True),
                randomize_test_data=data_config.get('randomize_test_data', True),
                data_templates_directory=data_config.get('data_templates_directory', 'test_data_templates')
            )

        if 'notifications' in config_dict:
            notif_config = config_dict['notifications']
            config.notifications = NotificationConfig(
                enable_notifications=notif_config.get('enable_notifications', False),
                notification_webhook=notif_config.get('notification_webhook'),
                notify_on_failure=notif_config.get('notify_on_failure', True),
                notify_on_success=notif_config.get('notify_on_success', False),
                include_screenshots=notif_config.get('include_screenshots', True)
            )

        if 'custom_settings' in config_dict:
            config.custom_settings = config_dict['custom_settings']

        return config

    def get_api_base_url(self) -> str:
        """Get API base URL"""
        protocol = "https" if self.server.use_ssl else "http"
        return f"{protocol}://{self.server.backend_host}:{self.server.backend_port}"

    def get_frontend_url(self) -> str:
        """Get frontend base URL"""
        protocol = "https" if self.server.use_ssl else "http"
        return f"{protocol}://{self.server.frontend_host}:{self.server.frontend_port}"

    def get_performance_threshold(self, operation: str) -> float:
        """Get performance threshold for specific operation"""
        return self.performance.performance_thresholds.get(
            operation,
            self.performance.max_api_response_time
        )

    def is_ci_environment(self) -> bool:
        """Check if running in CI environment"""
        return self.environment == TestEnvironment.CI

    def is_production_environment(self) -> bool:
        """Check if running in production environment"""
        return self.environment == TestEnvironment.PRODUCTION

    def should_generate_reports(self) -> bool:
        """Check if should generate test reports"""
        return self.execution.generate_html_report or self.execution.generate_coverage_report

    def get_browser_options(self) -> Dict[str, Any]:
        """Get browser-specific options for Selenium"""
        options = {
            'headless': self.browser.headless,
            'window_size': self.browser.window_size,
            'implicit_wait': self.browser.implicit_wait,
            'page_load_timeout': self.browser.page_load_timeout,
            'script_timeout': self.browser.script_timeout
        }

        if self.browser.browser_type.lower() == 'chrome':
            from selenium.webdriver.chrome.options import Options as ChromeOptions
            chrome_options = ChromeOptions()
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument(f"--window-size={self.browser.window_size[0]},{self.browser.window_size[1]}")

            if self.browser.headless:
                chrome_options.add_argument("--headless")

            if self.browser.download_directory:
                chrome_options.add_experimental_option(
                    "prefs",
                    {"download.default_directory": self.browser.download_directory}
                )

            options['chrome_options'] = chrome_options

        elif self.browser.browser_type.lower() == 'firefox':
            from selenium.webdriver.firefox.options import Options as FirefoxOptions
            firefox_options = FirefoxOptions()

            if self.browser.headless:
                firefox_options.add_argument("--headless")

            options['firefox_options'] = firefox_options

        return options


# Global configuration instance
_current_config: Optional[TestConfiguration] = None


def get_config() -> TestConfiguration:
    """Get current test configuration"""
    global _current_config

    if _current_config is None:
        _current_config = TestConfiguration.from_environment()

    return _current_config


def set_config(config: TestConfiguration) -> None:
    """Set current test configuration"""
    global _current_config
    _current_config = config


def reset_config() -> None:
    """Reset configuration to default"""
    global _current_config
    _current_config = None


# Environment-specific configuration shortcuts
def get_dev_config() -> TestConfiguration:
    """Get development configuration"""
    return TestConfiguration(environment=TestEnvironment.DEVELOPMENT)


def get_ci_config() -> TestConfiguration:
    """Get CI configuration"""
    return TestConfiguration(environment=TestEnvironment.CI)


def get_production_config() -> TestConfiguration:
    """Get production configuration"""
    return TestConfiguration(environment=TestEnvironment.PRODUCTION)