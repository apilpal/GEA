#!/usr/bin/env python3
"""
Coverage report generator script.

This script generates comprehensive coverage reports in multiple formats.

Usage:
    python run_coverage.py [OPTIONS]

Options:
    --format FORMAT  Report format: html, xml, json, all (default: all)
    --fail-under PCT Minimum coverage percentage (default: 80)
    --show-missing   Show missing lines in output
    --include-external Include external packages
    --verbose        Verbose output
"""

import subprocess
import sys
import argparse
from pathlib import Path


def main():
    """Generate coverage report."""
    parser = argparse.ArgumentParser(description="Generate coverage report")
    parser.add_argument(
        "--format",
        choices=["html", "xml", "json", "all"],
        default="all",
        help="Report format"
    )
    parser.add_argument(
        "--fail-under",
        type=int,
        default=80,
        help="Minimum coverage percentage"
    )
    parser.add_argument("--show-missing", action="store_true", help="Show missing lines")
    parser.add_argument("--include-external", action="store_true", help="Include external packages")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")

    args = parser.parse_args()

    cmd = [sys.executable, "-m", "pytest"]

    # Base coverage options
    cmd.extend([
        "--cov=backend/src",
        f"--cov-fail-under={args.fail_under}"
    ])

    # Add report formats
    if args.format == "html" or args.format == "all":
        cmd.append("--cov-report=html:htmlcov")
    if args.format == "xml" or args.format == "all":
        cmd.append("--cov-report=xml:coverage.xml")
    if args.format == "json" or args.format == "all":
        cmd.append("--cov-report=json:coverage.json")

    # Always show term-missing for console output
    cmd.append("--cov-report=term-missing")

    if args.show_missing:
        cmd.append("--cov-report=term-missing")

    if args.verbose:
        cmd.append("-v")

    print(f"Generating coverage report: {' '.join(cmd)}")

    # Run coverage
    result = subprocess.run(cmd, cwd=Path(__file__).parent)
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())