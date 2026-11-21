#!/usr/bin/env python3
"""
Performance and benchmark test runner script.

This script runs performance tests, benchmarks, and profiling.

Usage:
    python run_performance_tests.py [OPTIONS]

Options:
    --benchmark        Run benchmark tests
    --profile         Enable profiling
    --memory          Memory profiling
    --verbose         Verbose output
    --save-results    Save results to file
"""

import subprocess
import sys
import argparse
import os
from pathlib import Path


def main():
    """Run performance tests."""
    parser = argparse.ArgumentParser(description="Run performance tests")
    parser.add_argument("--benchmark", action="store_true", help="Run benchmarks")
    parser.add_argument("--profile", action="store_true", help="Enable profiling")
    parser.add_argument("--memory", action="store_true", help="Memory profiling")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--save-results", action="store_true", help="Save results")

    args = parser.parse_args()

    cmd = [sys.executable, "-m", "pytest"]

    # Add performance test markers
    cmd.extend([
        "-m", "performance or benchmark",
        "--benchmark-only",
        "--benchmark-sort=mean",
        "--benchmark-timer=time.perf_counter",
        "--durations=20",
        "--durations-min=0.5"
    ])

    if args.profile:
        cmd.append("--profile")

    if args.verbose:
        cmd.append("-v")

    if args.save_results:
        # Create results directory
        results_dir = Path(__file__).parent / "performance_results"
        results_dir.mkdir(exist_ok=True)
        cmd.extend([
            "--benchmark-json=performance_results/benchmark.json",
            "--html=performance_results/report.html"
        ])

    print(f"Running performance tests: {' '.join(cmd)}")

    # Run the tests
    result = subprocess.run(cmd, cwd=Path(__file__).parent)
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())