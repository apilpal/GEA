#!/usr/bin/env python3
"""
CI/CD test runner script.

This script runs tests in CI mode with appropriate configuration
for continuous integration environments.

Usage:
    python run_ci_tests.py [OPTIONS]

Options:
    --fail-under PCT    Minimum coverage percentage (default: 85)
    --junit-xml        Generate JUnit XML report
    --coverage-xml     Generate coverage XML report
    --timeout SEC      Timeout in seconds (default: 300)
    --maxfail NUM      Maximum number of failures (default: 5)
"""

import subprocess
import sys
import argparse
import os
from pathlib import Path


def main():
    """Run tests in CI mode."""
    parser = argparse.ArgumentParser(description="Run tests in CI mode")
    parser.add_argument("--fail-under", type=int, default=85, help="Minimum coverage")
    parser.add_argument("--junit-xml", action="store_true", help="Generate JUnit XML")
    parser.add_argument("--coverage-xml", action="store_true", help="Generate coverage XML")
    parser.add_argument("--timeout", type=int, default=300, help="Timeout in seconds")
    parser.add_argument("--maxfail", type=int, default=5, help="Maximum failures")

    args = parser.parse_args()

    cmd = [sys.executable, "-m", "pytest"]

    # CI-specific options
    cmd.extend([
        f"--cov-fail-under={args.fail_under}",
        f"--timeout={args.timeout}",
        f"--maxfail={args.maxfail}",
        "-q"  # Quiet mode for CI
    ])

    # Add coverage
    cmd.extend([
        "--cov=backend/src",
        "--cov-report=term-missing"
    ])

    # Add XML reports if requested
    if args.junit_xml:
        cmd.append("--junitxml=junit.xml")
    if args.coverage_xml:
        cmd.append("--cov-report=xml:coverage.xml")

    # Set CI environment variable
    os.environ["CI"] = "true"

    print(f"Running CI tests: {' '.join(cmd)}")

    # Run the tests
    result = subprocess.run(cmd, cwd=Path(__file__).parent)
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())