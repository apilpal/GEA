#!/usr/bin/env python3
"""
Unit test runner script.

This script runs only unit tests with appropriate configuration
for fast feedback during development.

Usage:
    python run_unit_tests.py [OPTIONS]

Options:
    --parallel      Run tests in parallel
    --verbose       Verbose output
    --fast          Run tests quickly
    --coverage      Include coverage report
    --markers MARKER Run tests with specific marker
"""

import subprocess
import sys
import argparse
from pathlib import Path


def main():
    """Run unit tests."""
    parser = argparse.ArgumentParser(description="Run unit tests")
    parser.add_argument("--parallel", action="store_true", help="Run in parallel")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--fast", action="store_true", help="Fast mode")
    parser.add_argument("--coverage", action="store_true", help="Include coverage")
    parser.add_argument("--markers", type=str, help="Specific markers")

    args = parser.parse_args()

    cmd = [sys.executable, "-m", "pytest"]

    # Add unit test markers
    cmd.extend(["-m", "unit"])

    # Add coverage if requested
    if args.coverage:
        cmd.extend([
            "--cov=backend/src",
            "--cov-report=term-missing",
            "--cov-report=html:htmlcov",
            "--cov-fail-under=85"
        ])

    # Add parallel execution
    if args.parallel:
        cmd.extend(["-n", "auto"])

    # Add verbosity
    if args.verbose:
        cmd.append("-v")
    elif args.fast:
        cmd.extend(["-q", "--tb=no"])

    # Add specific markers
    if args.markers:
        cmd.extend(["-m", args.markers])

    print(f"Running unit tests: {' '.join(cmd)}")

    # Run the tests
    result = subprocess.run(cmd, cwd=Path(__file__).parent)
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())