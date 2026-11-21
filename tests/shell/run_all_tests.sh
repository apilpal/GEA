#!/bin/bash

# Master Test Runner for Shell Scripts and Automation
# Runs all shell script tests and generates comprehensive reports

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$TEST_DIR/../.." && pwd)"
REPORTS_DIR="$TEST_DIR/reports"
LOG_FILE="$REPORTS_DIR/test_run_$(date +%Y%m%d_%H%M%S).log"

# Create reports directory
mkdir -p "$REPORTS_DIR"

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - SUCCESS: $1" >> "$LOG_FILE"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: $1" >> "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: $1" >> "$LOG_FILE"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - INFO: $1" >> "$LOG_FILE"
}

print_header() {
    echo -e "${PURPLE}🔧 $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - HEADER: $1" >> "$LOG_FILE"
}

# Test execution tracking
declare -A TEST_RESULTS
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test_script() {
    local test_script="$1"
    local test_name="$2"

    print_info "Running $test_name..."

    if [ -f "$test_script" ] && [ -x "$test_script" ]; then
        local start_time=$(date +%s)

        if bash "$test_script" >> "$LOG_FILE" 2>&1; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))

            TEST_RESULTS[$test_name]="PASSED"
            print_status "$test_name completed successfully (${duration}s)"
            ((PASSED_TESTS++))
        else
            local exit_code=$?
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))

            TEST_RESULTS[$test_name]="FAILED"
            print_error "$test_name failed with exit code $exit_code (${duration}s)"
            ((FAILED_TESTS++))
        fi
    else
        TEST_RESULTS[$test_name]="SKIPPED"
        print_warning "$test_name skipped (file not found or not executable)"
    fi

    ((TOTAL_TESTS++))
}

run_shell_script_tests() {
    print_header "Running Shell Script Tests"
    echo "============================"

    # Test individual shell scripts
    run_test_script "$TEST_DIR/test_build.sh" "Build Script Tests"
    run_test_script "$TEST_DIR/test_run.sh" "Run Script Tests"
    run_test_script "$TEST_DIR/test_test.sh" "Test Script Tests"
    run_test_script "$TEST_DIR/test_test_backend.sh" "Backend Test Script Tests"
    run_test_script "$TEST_DIR/test_test_frontend.sh" "Frontend Test Script Tests"

    echo ""
}

run_framework_tests() {
    print_header "Running Framework Tests"
    echo "======================="

    # Test shell test framework
    run_test_script "$TEST_DIR/shell_test_framework.sh" "Shell Test Framework"

    # Test CI/CD framework
    run_test_script "$TEST_DIR/ci_cd_framework.sh" "CI/CD Framework"

    echo ""
}

run_utility_tests() {
    print_header "Running Utility Tests"
    echo "======================"

    # Test shell test utilities
    if [ -f "$TEST_DIR/shell_test_utils.sh" ]; then
        print_info "Testing utility functions..."

        # Test script analysis
        if bash "$TEST_DIR/shell_test_utils.sh" analyze_script "$PROJECT_ROOT/build.sh" >/dev/null 2>&1; then
            print_status "Script analysis utility working"
        else
            print_error "Script analysis utility failed"
        fi

        # Test script validation
        if bash "$TEST_DIR/shell_test_utils.sh" validate_all_scripts "$PROJECT_ROOT" >/dev/null 2>&1; then
            print_status "Script validation utility working"
        else
            print_error "Script validation utility failed"
        fi
    fi

    echo ""
}

run_enhanced_script_tests() {
    print_header "Running Enhanced Script Tests"
    echo "=============================="

    # Test enhanced scripts if they exist
    if [ -f "$TEST_DIR/enhanced_scripts.sh" ]; then
        if bash "$TEST_DIR/enhanced_scripts.sh" >/dev/null 2>&1; then
            print_status "Enhanced scripts creation successful"

            # Check if enhanced scripts were created
            if [ -f "$PROJECT_ROOT/build_enhanced.sh" ]; then
                print_status "Enhanced build script created"
            fi

            if [ -f "$PROJECT_ROOT/run_enhanced.sh" ]; then
                print_status "Enhanced run script created"
            fi

            if [ -f "$PROJECT_ROOT/test_enhanced.sh" ]; then
                print_status "Enhanced test script created"
            fi
        else
            print_error "Enhanced scripts creation failed"
        fi
    fi

    echo ""
}

generate_final_report() {
    print_header "Final Test Report"
    echo "================="

    echo "Test Execution Summary:"
    echo "  Total Tests: $TOTAL_TESTS"
    echo "  Passed: $PASSED_TESTS"
    echo "  Failed: $FAILED_TESTS"
    echo "  Success Rate: $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l 2>/dev/null || echo "0")%"
    echo ""

    echo "Individual Test Results:"
    for test_name in "${!TEST_RESULTS[@]}"; do
        local status="${TEST_RESULTS[$test_name]}"
        case "$status" in
            "PASSED") echo "  ✅ $test_name" ;;
            "FAILED") echo "  ❌ $test_name" ;;
            "SKIPPED") echo "  ⏭️  $test_name" ;;
        esac
    done

    echo ""
    echo "Generated Files:"
    echo "  Log File: $LOG_FILE"
    echo "  Reports Directory: $REPORTS_DIR"
    echo ""

    # Save summary to file
    cat > "$REPORTS_DIR/test_summary_$(date +%Y%m%d_%H%M%S).txt" << EOF
Shell Script Testing Framework - Test Summary
Generated: $(date)
Project: $PROJECT_ROOT

Test Results:
  Total Tests: $TOTAL_TESTS
  Passed: $PASSED_TESTS
  Failed: $FAILED_TESTS
  Success Rate: $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l 2>/dev/null || echo "0")%

Individual Results:
$(for test_name in "${!TEST_RESULTS[@]}"; do
    echo "  $test_name: ${TEST_RESULTS[$test_name]}"
done)

Log File: $LOG_FILE
Reports Directory: $REPORTS_DIR
EOF

    if [ $FAILED_TESTS -eq 0 ]; then
        print_status "All tests completed successfully! 🎉"
        echo ""
        print_info "The shell script testing framework is working correctly."
        print_info "You can now use the created test scripts to validate your shell scripts."
        return 0
    else
        print_error "Some tests failed! ❌"
        echo ""
        print_info "Check the log file for detailed error information: $LOG_FILE"
        return 1
    fi
}

show_help() {
    print_header "Shell Script Testing Framework"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -v, --verbose       Enable verbose output"
    echo "  -q, --quick         Run only essential tests"
    echo "  --skip-ci           Skip CI/CD framework tests"
    echo "  --skip-utils        Skip utility tests"
    echo ""
    echo "Test Categories:"
    echo "  - Shell script tests (build.sh, run.sh, test.sh, etc.)"
    echo "  - Framework tests (testing framework, CI/CD simulation)"
    echo "  - Utility tests (analysis, validation, profiling tools)"
    echo "  - Enhanced script tests (improved versions with better error handling)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all tests"
    echo "  $0 --quick           # Run only essential tests"
    echo "  $0 --skip-ci         # Skip CI/CD tests"
    echo ""
}

main() {
    local start_time=$(date +%s)
    local verbose=false
    local quick_mode=false
    local skip_ci=false
    local skip_utils=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            -q|--quick)
                quick_mode=true
                shift
                ;;
            --skip-ci)
                skip_ci=true
                shift
                ;;
            --skip-utils)
                skip_utils=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    print_header "Shell Script Testing Framework - Master Test Runner"
    echo "==================================================="
    echo "Start Time: $(date)"
    echo "Project: $PROJECT_ROOT"
    echo "Test Directory: $TEST_DIR"
    echo "Reports Directory: $REPORTS_DIR"
    echo "Log File: $LOG_FILE"
    echo ""

    if [ "$verbose" = true ]; then
        print_info "Verbose mode enabled"
    fi

    if [ "$quick_mode" = true ]; then
        print_info "Quick mode enabled - running essential tests only"
    fi

    if [ "$skip_ci" = true ]; then
        print_info "Skipping CI/CD framework tests"
    fi

    if [ "$skip_utils" = true ]; then
        print_info "Skipping utility tests"
    fi

    echo ""

    # Run test categories
    run_shell_script_tests

    if [ "$quick_mode" = false ]; then
        if [ "$skip_ci" = false ]; then
            run_framework_tests
        fi

        if [ "$skip_utils" = false ]; then
            run_utility_tests
        fi

        run_enhanced_script_tests
    fi

    # Generate final report
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))

    echo ""
    print_info "Total execution time: ${total_duration}s"

    generate_final_report

    # Exit with appropriate code
    if [ $FAILED_TESTS -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"