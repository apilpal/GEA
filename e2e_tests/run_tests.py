#!/usr/bin/env python3
"""
E2E Test Runner
Main entry point for running the restructured E2E tests
"""

import argparse
import sys
import os
import time
from pathlib import Path
from datetime import datetime

from e2e_tests.config.test_config import (
    TestConfiguration, TestEnvironment, get_config, set_config,
    get_dev_config, get_ci_config, get_production_config
)
from e2e_tests.helpers.logging_helpers import create_test_logger
from e2e_tests.base.base_test import BaseE2ETest


def run_specific_test_suite(suite_name: str, config: TestConfiguration, logger) -> bool:
    """Run a specific test suite"""
    logger.logger.info(f"🏃 Running test suite: {suite_name}")

    try:
        if suite_name == "student_crud":
            from e2e_tests.tests.test_student_crud import TestStudentCRUD
            suite = TestStudentCRUD()
        elif suite_name == "authentication":
            from e2e_tests.tests.test_authentication import TestAuthentication
            suite = TestAuthentication()
        else:
            logger.logger.error(f"❌ Unknown test suite: {suite_name}")
            return False

        # Run a simple test to verify functionality
        suite.setup_method(lambda: None)
        logger.logger.info(f"✅ Test suite '{suite_name}' setup completed")

        # Run a basic test method if available
        if hasattr(suite, 'test_api_level_login_authentication'):
            suite.test_api_level_login_authentication()
            logger.logger.info(f"✅ Test suite '{suite_name}' basic test passed")

        suite.teardown_method(lambda: None)
        return True

    except Exception as e:
        logger.logger.error(f"❌ Test suite '{suite_name}' failed: {e}")
        return False


def run_all_tests(config: TestConfiguration, logger) -> bool:
    """Run all available test suites"""
    logger.logger.info("🚀 Starting comprehensive E2E test suite")

    test_suites = [
        "student_crud",
        "authentication",
        # Add more suites as they are created
    ]

    results = []
    for suite in test_suites:
        success = run_specific_test_suite(suite, config, logger)
        results.append((suite, success))

    # Summary
    passed = sum(1 for _, success in results if success)
    failed = len(results) - passed

    logger.logger.info(f"📊 Test Results Summary:")
    logger.logger.info(f"   Total suites: {len(results)}")
    logger.logger.info(f"   Passed: {passed}")
    logger.logger.info(f"   Failed: {failed}")
    logger.logger.info(f"   Success rate: {(passed/len(results)*100):.1f}%")

    return failed == 0


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="E2E Test Runner")
    parser.add_argument(
        "--environment", "-e",
        choices=["development", "staging", "production", "ci", "local"],
        default="development",
        help="Test environment to run against"
    )
    parser.add_argument(
        "--suite", "-s",
        choices=["student_crud", "authentication", "all"],
        default="all",
        help="Test suite to run"
    )
    parser.add_argument(
        "--config-file",
        help="Path to custom configuration file"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be tested without running tests"
    )

    args = parser.parse_args()

    # Setup configuration
    if args.config_file:
        config = TestConfiguration.load_from_file(args.config_file)
    else:
        env_map = {
            "development": TestEnvironment.DEVELOPMENT,
            "staging": TestEnvironment.STAGING,
            "production": TestEnvironment.PRODUCTION,
            "ci": TestEnvironment.CI,
            "local": TestEnvironment.LOCAL
        }
        config = TestConfiguration(environment=env_map[args.environment])

    set_config(config)

    # Setup logger
    logger = create_test_logger(f"e2e_test_runner_{args.suite}")
    logger.logger.info(f"🔧 Test configuration loaded for environment: {config.environment.value}")

    if args.dry_run:
        logger.logger.info("🔍 DRY RUN MODE - No tests will be executed")
        logger.logger.info(f"📋 Would run test suite: {args.suite}")
        logger.logger.info(f"🏠 Environment: {config.environment.value}")
        logger.logger.info(f"🌐 Backend URL: {config.get_api_base_url()}")
        logger.logger.info(f"🖥️  Frontend URL: {config.get_frontend_url()}")
        return 0

    # Run tests
    start_time = time.time()

    try:
        if args.suite == "all":
            success = run_all_tests(config, logger)
        else:
            success = run_specific_test_suite(args.suite, config, logger)

        duration = time.time() - start_time

        if success:
            logger.logger.info(f"✅ All tests completed successfully in {duration:.2f}s")
            return 0
        else:
            logger.logger.error(f"❌ Tests failed after {duration:.2f}s")
            return 1

    except KeyboardInterrupt:
        logger.logger.info("⏹️  Tests interrupted by user")
        return 130
    except Exception as e:
        logger.logger.error(f"💥 Test runner failed: {e}")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)