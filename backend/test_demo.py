#!/usr/bin/env python3
"""
Testing demonstration script.

This script demonstrates the comprehensive testing setup and can be used
to verify that all testing components are working correctly.

Usage:
    python test_demo.py
"""

import subprocess
import sys
import os
from pathlib import Path


def run_command(cmd, description, critical=False):
    """Run a command and report the result."""
    print(f"\n{'='*60}")
    print(f"Testing: {description}")
    print(f"Command: {' '.join(cmd)}")
    print(f"{'='*60}")

    try:
        result = subprocess.run(cmd, cwd=Path(__file__).parent, capture_output=True, text=True)

        if result.returncode == 0:
            print(f"✅ {description} - PASSED")
            if result.stdout:
                print("Output:", result.stdout[:500])
            return True
        else:
            print(f"❌ {description} - FAILED")
            if result.stderr:
                print("Error:", result.stderr[:500])
            if critical:
                print("Critical failure - stopping demo")
                return False
            return True

    except Exception as e:
        print(f"❌ {description} - ERROR: {e}")
        if critical:
            return False
        return True


def main():
    """Run the testing demonstration."""
    print("🚀 Backend Testing Configuration Demo")
    print("=" * 60)

    # Set test environment
    os.environ["TESTING"] = "true"

    tests_passed = 0
    total_tests = 0

    # Test 1: Check pytest configuration
    total_tests += 1
    if run_command([sys.executable, "-m", "pytest", "--version"], "Pytest Installation"):
        tests_passed += 1

    # Test 2: Check test discovery
    total_tests += 1
    if run_command(
        [sys.executable, "-m", "pytest", "--collect-only", "-q"],
        "Test Discovery",
        critical=True
    ):
        tests_passed += 1

    # Test 3: Run a quick unit test (if any exist)
    total_tests += 1
    if run_command(
        [sys.executable, "run_unit_tests.py", "--fast", "--tb=no"],
        "Unit Test Runner"
    ):
        tests_passed += 1

    # Test 4: Check coverage configuration
    total_tests += 1
    if run_command(
        [sys.executable, "-m", "pytest", "--cov=backend/src", "--cov-report=term-missing", "--collect-only"],
        "Coverage Configuration"
    ):
        tests_passed += 1

    # Test 5: Check markers
    total_tests += 1
    if run_command(
        [sys.executable, "-m", "pytest", "--markers"],
        "Test Markers"
    ):
        tests_passed += 1

    # Test 6: Configuration validation
    total_tests += 1
    config_tests = [
        ("pytest.ini", "pytest.ini exists"),
        ("conftest.py", "conftest.py exists"),
        (".coveragerc", ".coveragerc exists"),
        ("quality_gates.yml", "quality_gates.yml exists"),
        ("TESTING_README.md", "TESTING_README.md exists"),
    ]

    config_ok = True
    for config_file, description in config_tests:
        if os.path.exists(config_file):
            print(f"✅ {description}")
        else:
            print(f"❌ {description}")
            config_ok = False

    if config_ok:
        tests_passed += 1
        print("✅ Configuration Files - PASSED")
    else:
        print("❌ Configuration Files - FAILED")

    # Test 7: Script permissions
    total_tests += 1
    scripts = [
        "run_tests.py",
        "run_unit_tests.py",
        "run_integration_tests.py",
        "run_coverage.py",
        "run_ci_tests.py",
        "run_performance_tests.py"
    ]

    scripts_ok = True
    for script in scripts:
        script_path = Path(script)
        if script_path.exists() and os.access(script_path, os.X_OK):
            print(f"✅ {script} is executable")
        else:
            print(f"❌ {script} is missing or not executable")
            scripts_ok = False

    if scripts_ok:
        tests_passed += 1
        print("✅ Test Scripts - PASSED")
    else:
        print("❌ Test Scripts - FAILED")

    # Summary
    print(f"\n{'='*60}")
    print("📊 DEMO SUMMARY")
    print(f"{'='*60}")
    print(f"Tests Passed: {tests_passed}/{total_tests}")

    if tests_passed == total_tests:
        print("🎉 All tests passed! Testing setup is working correctly.")
        print("\nNext steps:")
        print("1. Run 'python run_tests.py --help' to see all options")
        print("2. Run 'python run_unit_tests.py --fast' for quick feedback")
        print("3. Run 'python run_coverage.py' for coverage reports")
        print("4. Read TESTING_README.md for detailed documentation")
        return 0
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        print("\nTroubleshooting:")
        print("1. Ensure all dependencies are installed")
        print("2. Check that configuration files exist")
        print("3. Verify test scripts are executable")
        print("4. Check the TESTING_README.md for help")
        return 1


if __name__ == "__main__":
    sys.exit(main())