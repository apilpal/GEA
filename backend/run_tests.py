#!/usr/bin/env python3
"""
Comprehensive test runner script for the backend.

This script provides a unified interface for running different types of tests
with various configurations and reporting options.

Usage:
    python run_tests.py [OPTIONS] [TEST_PATHS]

Options:
    --unit                  Run only unit tests
    --integration          Run only integration tests
    --coverage             Generate coverage report
    --performance          Run performance tests
    --parallel             Run tests in parallel
    --verbose              Verbose output
    --debug                Debug mode
    --fast                 Run tests quickly (skip slow tests)
    --slow                 Include slow tests
    --markers MARKER       Run tests with specific marker
    --env ENV              Environment (dev, test, prod)
    --report-format FORMAT HTML, XML, JSON, or ALL
    --quality-gates        Enable strict quality gates
    --benchmark            Run benchmark tests
    --help                 Show this help message

Examples:
    python run_tests.py --unit --coverage
    python run_tests.py --integration --parallel
    python run_tests.py --performance --verbose
    python run_tests.py --markers "not slow" --fast
    python run_tests.py --quality-gates --report-format ALL
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path
from typing import List, Optional


class TestRunner:
    """Main test runner class that handles different test scenarios."""

    def __init__(self):
        self.backend_dir = Path(__file__).parent
        self.python_path = sys.executable
        self.base_command = [self.python_path, "-m", "pytest"]

    def run_unit_tests(self, args: argparse.Namespace) -> int:
        """Run unit tests only."""
        cmd = self.base_command.copy()
        cmd.extend([
            "-m", "unit",
            "--cov=backend/src",
            "--cov-report=term-missing",
            "--cov-fail-under=85"
        ])

        if args.coverage:
            cmd.extend([
                "--cov-report=html:htmlcov",
                "--cov-report=xml:coverage.xml"
            ])

        if args.parallel:
            cmd.extend(["-n", "auto"])

        if args.verbose:
            cmd.append("-v")
        elif args.fast:
            cmd.extend(["-q", "--tb=no"])

        if args.markers:
            cmd.extend(["-m", args.markers])

        return self._execute_command(cmd, "Unit Tests")

    def run_integration_tests(self, args: argparse.Namespace) -> int:
        """Run integration tests only."""
        cmd = self.base_command.copy()
        cmd.extend([
            "-m", "integration or database or api",
            "--cov=backend/src",
            "--cov-report=term-missing",
            "--cov-fail-under=75",
            "--timeout=120"
        ])

        if args.coverage:
            cmd.extend([
                "--cov-report=html:htmlcov",
                "--cov-report=xml:coverage.xml"
            ])

        if args.parallel:
            cmd.extend(["-n", "2"])  # Limit parallel for integration tests

        if args.verbose:
            cmd.append("-v")
        elif args.fast:
            cmd.extend(["-q", "--tb=no"])

        return self._execute_command(cmd, "Integration Tests")

    def run_performance_tests(self, args: argparse.Namespace) -> int:
        """Run performance and benchmark tests."""
        cmd = self.base_command.copy()
        cmd.extend([
            "-m", "performance or benchmark",
            "--benchmark-only",
            "--benchmark-sort=mean",
            "--benchmark-timer=time.perf_counter",
            "--durations=20",
            "--durations-min=0.5"
        ])

        if args.verbose:
            cmd.append("-v")

        return self._execute_command(cmd, "Performance Tests")

    def run_coverage_report(self, args: argparse.Namespace) -> int:
        """Generate coverage report."""
        cmd = self.base_command.copy()
        cmd.extend([
            "--cov=backend/src",
            "--cov-report=term-missing",
            "--cov-report=html:htmlcov",
            "--cov-report=xml:coverage.xml",
            "--cov-report=json:coverage.json",
            "--cov-fail-under=80"
        ])

        if args.markers:
            cmd.extend(["-m", args.markers])

        return self._execute_command(cmd, "Coverage Report")

    def run_quality_gates(self, args: argparse.Namespace) -> int:
        """Run tests with strict quality gates."""
        cmd = self.base_command.copy()
        cmd.extend([
            "--cov=backend/src",
            "--cov-report=term-missing",
            "--cov-report=html:htmlcov",
            "--cov-report=xml:coverage.xml",
            "--cov-fail-under=90",
            "--timeout=60",
            "--maxfail=0",
            "--durations=20",
            "--durations-min=0.1",
            "-q"
        ])

        return self._execute_command(cmd, "Quality Gates")

    def run_ci_tests(self, args: argparse.Namespace) -> int:
        """Run tests in CI mode."""
        cmd = self.base_command.copy()
        cmd.extend([
            "--cov=backend/src",
            "--cov-report=term-missing",
            "--cov-report=xml:coverage.xml",
            "--cov-fail-under=85",
            "--junitxml=junit.xml",
            "--timeout=300",
            "--maxfail=5",
            "-q"
        ])

        return self._execute_command(cmd, "CI Tests")

    def _execute_command(self, cmd: List[str], test_type: str) -> int:
        """Execute pytest command and return exit code."""
        print(f"\n{'='*60}")
        print(f"Running {test_type}")
        print(f"Command: {' '.join(cmd)}")
        print(f"{'='*60}")

        try:
            result = subprocess.run(cmd, cwd=self.backend_dir)
            return result.returncode
        except KeyboardInterrupt:
            print(f"\n{test_type} interrupted by user")
            return 130
        except Exception as e:
            print(f"Error running {test_type}: {e}")
            return 1

    def run_tests(self, args: argparse.Namespace) -> int:
        """Main test runner based on arguments."""

        # Set environment variables
        if args.env:
            os.environ["TEST_ENV"] = args.env

        # Handle different test scenarios
        if args.unit:
            return self.run_unit_tests(args)
        elif args.integration:
            return self.run_integration_tests(args)
        elif args.performance:
            return self.run_performance_tests(args)
        elif args.coverage:
            return self.run_coverage_report(args)
        elif args.quality_gates:
            return self.run_quality_gates(args)
        elif args.benchmark:
            return self.run_performance_tests(args)
        else:
            # Run all tests
            cmd = self.base_command.copy()
            cmd.extend([
                "--cov=backend/src",
                "--cov-report=term-missing",
                "--cov-report=html:htmlcov",
                "--cov-fail-under=80"
            ])

            if args.parallel:
                cmd.extend(["-n", "auto"])

            if args.verbose:
                cmd.append("-v")
            elif args.fast:
                cmd.extend(["-q", "--tb=no"])

            if args.markers:
                cmd.extend(["-m", args.markers])

            return self._execute_command(cmd, "All Tests")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Comprehensive test runner for backend",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    parser.add_argument(
        "--unit",
        action="store_true",
        help="Run only unit tests"
    )

    parser.add_argument(
        "--integration",
        action="store_true",
        help="Run only integration tests"
    )

    parser.add_argument(
        "--coverage",
        action="store_true",
        help="Generate coverage report"
    )

    parser.add_argument(
        "--performance",
        action="store_true",
        help="Run performance tests"
    )

    parser.add_argument(
        "--parallel",
        action="store_true",
        help="Run tests in parallel"
    )

    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output"
    )

    parser.add_argument(
        "--debug",
        action="store_true",
        help="Debug mode"
    )

    parser.add_argument(
        "--fast",
        action="store_true",
        help="Run tests quickly (skip slow tests)"
    )

    parser.add_argument(
        "--slow",
        action="store_true",
        help="Include slow tests"
    )

    parser.add_argument(
        "--markers",
        type=str,
        help="Run tests with specific marker"
    )

    parser.add_argument(
        "--env",
        type=str,
        choices=["dev", "test", "prod"],
        help="Environment (dev, test, prod)"
    )

    parser.add_argument(
        "--report-format",
        type=str,
        choices=["HTML", "XML", "JSON", "ALL"],
        help="Report format"
    )

    parser.add_argument(
        "--quality-gates",
        action="store_true",
        help="Enable strict quality gates"
    )

    parser.add_argument(
        "--benchmark",
        action="store_true",
        help="Run benchmark tests"
    )

    parser.add_argument(
        "--help",
        action="store_true",
        help="Show this help message"
    )

    parser.add_argument(
        "test_paths",
        nargs="*",
        help="Specific test paths to run"
    )

    args = parser.parse_args()

    if args.help:
        parser.print_help()
        return 0

    # Create test runner and execute tests
    runner = TestRunner()
    exit_code = runner.run_tests(args)

    # Print summary
    if exit_code == 0:
        print("\n✅ All tests passed!")
    else:
        print(f"\n❌ Tests failed with exit code: {exit_code}")

    return exit_code


if __name__ == "__main__":
    sys.exit(main())