#!/usr/bin/env python3
"""
Integration test runner script.

This script runs integration tests including database tests,
API tests, and other integration scenarios.

Usage:
    python run_integration_tests.py [OPTIONS]

Options:
    --parallel      Run tests in parallel (limited)
    --verbose       Verbose output
    --fast          Run tests quickly
    --coverage      Include coverage report
    --timeout SEC  Timeout in seconds (default: 120)
"""

import subprocess
import sys
import argparse
from pathlib import Path


def main():
    """Run integration tests."""
    parser = argparse.ArgumentParser(description="Run integration tests")
    parser.add_argument("--parallel", action="store_true", help="Run in parallel")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--fast", action="store_true", help="Fast mode")
    parser.add_argument("--coverage", action="store_true", help="Include coverage")
    parser.add_argument("--timeout", type=int, default=120, help="Timeout in seconds")

    args = parser.parse_args()

    cmd = [sys.executable, "-m", "pytest"]

    # Add integration test markers
    cmd.extend([
        "-m", "integration or database or api",
        f"--timeout={args.timeout}"
    ])

    # Add coverage if requested
    if args.coverage:
        cmd.extend([
            "--cov=backend/src",
            "--cov-report=term-missing",
            "--cov-report=html:htmlcov",
            "--cov-fail-under=75"
        ])

    # Add parallel execution (limited for integration tests)
    if args.parallel:
        cmd.extend(["-n", "2"])

    # Add verbosity
    if args.verbose:
        cmd.append("-v")
    elif args.fast:
        cmd.extend(["-q", "--tb=no"])

    print(f"Running integration tests: {' '.join(cmd)}")

    # Run the tests
    result = subprocess.run(cmd, cwd=Path(__file__).parent)
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())