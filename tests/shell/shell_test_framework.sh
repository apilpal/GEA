#!/bin/bash

# Shell Script Testing Framework
# Comprehensive testing framework for shell scripts and automation

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test framework variables
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$TEST_DIR/../.." && pwd)"
TEST_RESULTS=()
TEST_COUNT=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test result counters
declare -A TEST_STATS=(
    [total]=0
    [passed]=0
    [failed]=0
    [skipped]=0
)

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${PURPLE}🔧 $1${NC}"
}

print_debug() {
    echo -e "${CYAN}🔍 $1${NC}"
}

# Initialize test framework
init_test_framework() {
    print_header "Shell Script Testing Framework"
    echo "======================================"
    print_info "Test Directory: $TEST_DIR"
    print_info "Project Root: $PROJECT_ROOT"
    echo ""

    # Create temporary directories for testing
    export TEST_TEMP_DIR=$(mktemp -d)
    export TEST_BACKUP_DIR=$(mktemp -d)

    # Ensure cleanup on exit
    trap cleanup EXIT
}

# Cleanup function
cleanup() {
    # Restore any backed up files
    if [ -d "$TEST_BACKUP_DIR" ]; then
        find "$TEST_BACKUP_DIR" -type f -exec bash -c '
            backup_file="$0"
            original_file="${backup_file#$TEST_BACKUP_DIR/}"
            if [ -f "$original_file" ]; then
                cp "$backup_file" "$original_file"
            fi
        ' {} \;
        rm -rf "$TEST_BACKUP_DIR"
    fi

    # Clean up temp directory
    if [ -d "$TEST_TEMP_DIR" ]; then
        rm -rf "$TEST_TEMP_DIR"
    fi
}

# Test assertion functions
assert_equals() {
    local expected="$1"
    local actual="$2"
    local message="${3:-}"

    ((TEST_COUNT++))
    TEST_STATS[total]=$TEST_COUNT

    if [ "$expected" = "$actual" ]; then
        print_status "PASS: ${message:-Expected '$expected', got '$actual'}"
        ((PASSED_TESTS++))
        TEST_STATS[passed]=$PASSED_TESTS
        return 0
    else
        print_error "FAIL: ${message:-Expected '$expected', got '$actual'}"
        ((FAILED_TESTS++))
        TEST_STATS[failed]=$FAILED_TESTS
        return 1
    fi
}

assert_not_equals() {
    local unexpected="$1"
    local actual="$2"
    local message="${3:-}"

    ((TEST_COUNT++))
    TEST_STATS[total]=$TEST_COUNT

    if [ "$unexpected" != "$actual" ]; then
        print_status "PASS: ${message:-Expected not '$unexpected', got '$actual'}"
        ((PASSED_TESTS++))
        TEST_STATS[passed]=$PASSED_TESTS
        return 0
    else
        print_error "FAIL: ${message:-Expected not '$unexpected', got '$actual'}"
        ((FAILED_TESTS++))
        TEST_STATS[failed]=$FAILED_TESTS
        return 1
    fi
}

assert_contains() {
    local expected="$1"
    local actual="$2"
    local message="${3:-}"

    ((TEST_COUNT++))
    TEST_STATS[total]=$TEST_COUNT

    if [[ "$actual" == *"$expected"* ]]; then
        print_status "PASS: ${message:-Expected '$expected' in '$actual'}"
        ((PASSED_TESTS++))
        TEST_STATS[passed]=$PASSED_TESTS
        return 0
    else
        print_error "FAIL: ${message:-Expected '$expected' in '$actual'}"
        ((FAILED_TESTS++))
        TEST_STATS[failed]=$FAILED_TESTS
        return 1
    fi
}

assert_file_exists() {
    local file="$1"
    local message="${2:-}"

    ((TEST_COUNT++))
    TEST_STATS[total]=$TEST_COUNT

    if [ -f "$file" ]; then
        print_status "PASS: ${message:-File '$file' exists}"
        ((PASSED_TESTS++))
        TEST_STATS[passed]=$PASSED_TESTS
        return 0
    else
        print_error "FAIL: ${message:-File '$file' does not exist}"
        ((FAILED_TESTS++))
        TEST_STATS[failed]=$FAILED_TESTS
        return 1
    fi
}

assert_file_not_exists() {
    local file="$1"
    local message="${2:-}"

    ((TEST_COUNT++))
    TEST_STATS[total]=$TEST_COUNT

    if [ ! -f "$file" ]; then
        print_status "PASS: ${message:-File '$file' does not exist}"
        ((PASSED_TESTS++))
        TEST_STATS[passed]=$PASSED_TESTS
        return 0
    else
        print_error "FAIL: ${message:-File '$file' exists}"
        ((FAILED_TESTS++))
        TEST_STATS[failed]=$FAILED_TESTS
        return 1
    fi
}

assert_dir_exists() {
    local dir="$1"
    local message="${2:-}"

    ((TEST_COUNT++))
    TEST_STATS[total]=$TEST_COUNT

    if [ -d "$dir" ]; then
        print_status "PASS: ${message:-Directory '$dir' exists}"
        ((PASSED_TESTS++))
        TEST_STATS[passed]=$PASSED_TESTS
        return 0
    else
        print_error "FAIL: ${message:-Directory '$dir' does not exist}"
        ((FAILED_TESTS++))
        TEST_STATS[failed]=$FAILED_TESTS
        return 1
    fi
}

assert_exit_code() {
    local expected_code="$1"
    local command="$2"
    local message="${3:-}"

    ((TEST_COUNT++))
    TEST_STATS[total]=$TEST_COUNT

    # Run command and capture exit code
    eval "$command"
    local actual_code=$?

    if [ "$expected_code" -eq "$actual_code" ]; then
        print_status "PASS: ${message:-Command '$command' exited with code $expected_code}"
        ((PASSED_TESTS++))
        TEST_STATS[passed]=$PASSED_TESTS
        return 0
    else
        print_error "FAIL: ${message:-Command '$command' exited with code $actual_code, expected $expected_code}"
        ((FAILED_TESTS++))
        TEST_STATS[failed]=$FAILED_TESTS
        return 1
    fi
}

# Mock functions for testing
mock_command() {
    local command="$1"
    local mock_script="$2"

    # Backup original command if it exists
    if command -v "$command" >/dev/null 2>&1; then
        cp "$(which "$command")" "$TEST_BACKUP_DIR/$(basename "$command")"
    fi

    # Create mock script
    cat > "$TEST_TEMP_DIR/$command" << EOF
#!/bin/bash
$mock_script
EOF
    chmod +x "$TEST_TEMP_DIR/$command"

    # Add to PATH
    export PATH="$TEST_TEMP_DIR:$PATH"
}

unmock_command() {
    local command="$1"

    # Restore original command if it was backed up
    if [ -f "$TEST_BACKUP_DIR/$(basename "$command")" ]; then
        sudo cp "$TEST_BACKUP_DIR/$(basename "$command")" "$(which "$command")" 2>/dev/null || true
    fi

    # Remove from PATH
    export PATH=${PATH#$TEST_TEMP_DIR:}
}

# Test execution functions
run_test() {
    local test_name="$1"
    local test_function="$2"

    print_info "Running test: $test_name"
    echo "----------------------------------------"

    # Reset counters for this test
    local test_passed=0
    local test_failed=0

    # Run the test function
    if "$test_function"; then
        test_passed=$((test_passed + 1))
        TEST_RESULTS+=("$test_name:PASSED")
    else
        test_failed=$((test_failed + 1))
        TEST_RESULTS+=("$test_name:FAILED")
    fi

    echo ""
}

run_all_tests() {
    local test_pattern="${1:-test_*.sh}"

    print_header "Running All Shell Script Tests"
    echo "==============================="

    # Find and run all test files
    for test_file in "$TEST_DIR/$test_pattern"; do
        if [ -f "$test_file" ] && [ -x "$test_file" ]; then
            print_info "Executing test file: $(basename "$test_file")"
            if ! bash "$test_file"; then
                print_warning "Test file $(basename "$test_file") had failures"
            fi
            echo ""
        fi
    done
}

# Test summary and reporting
print_test_summary() {
    echo ""
    print_header "Test Summary"
    echo "============"

    local total=${TEST_STATS[total]}
    local passed=${TEST_STATS[passed]}
    local failed=${TEST_STATS[failed]}

    echo "Total Tests: $total"
    echo "Passed: $passed"
    echo "Failed: $failed"

    if [ $failed -eq 0 ]; then
        print_status "All tests passed! 🎉"
        return 0
    else
        print_error "$failed test(s) failed! ❌"
        return 1
    fi
}

# Environment setup for testing
setup_test_environment() {
    print_info "Setting up test environment..."

    # Create mock project structure for testing
    mkdir -p "$TEST_TEMP_DIR/mock_project"
    cd "$TEST_TEMP_DIR/mock_project"

    # Create mock backend structure
    mkdir -p backend frontend
    touch backend/main.py backend/requirements.txt
    touch frontend/package.json

    # Create mock scripts
    cat > build.sh << 'EOF'
#!/bin/bash
echo "Mock build script executed"
exit 0
EOF
    chmod +x build.sh

    cat > run.sh << 'EOF'
#!/bin/bash
echo "Mock run script executed"
exit 0
EOF
    chmod +x run.sh

    cd "$PROJECT_ROOT"
    print_status "Test environment setup complete"
}

# Script validation functions
validate_script() {
    local script="$1"
    local description="${2:-}"

    print_info "Validating script: $(basename "$script") - $description"

    # Check if script exists
    assert_file_exists "$script" "Script file exists"

    # Check if script is executable
    if [ -x "$script" ]; then
        print_status "Script is executable"
    else
        print_warning "Script is not executable"
        chmod +x "$script"
        print_status "Made script executable"
    fi

    # Check for shebang
    if head -n 1 "$script" | grep -q "^#!/"; then
        print_status "Script has proper shebang"
    else
        print_error "Script missing shebang"
        return 1
    fi

    # Check for basic syntax (bash -n)
    if bash -n "$script" 2>/dev/null; then
        print_status "Script syntax is valid"
    else
        print_error "Script has syntax errors"
        return 1
    fi
}

# Performance testing
time_script() {
    local script="$1"
    local iterations="${2:-1}"
    local description="${3:-}"

    print_info "Timing script: $(basename "$script") - $description"

    local total_time=0
    for ((i=1; i<=iterations; i++)); do
        local start_time=$(date +%s%N)
        if bash "$script" >/dev/null 2>&1; then
            local end_time=$(date +%s%N)
            local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
            total_time=$((total_time + duration))
            print_debug "Run $i: ${duration}ms"
        else
            print_error "Script failed on run $i"
            return 1
        fi
    done

    local avg_time=$((total_time / iterations))
    print_status "Average execution time: ${avg_time}ms over $iterations runs"
    return 0
}

# Export functions for use in test scripts
export -f print_status print_error print_warning print_info print_header print_debug
export -f assert_equals assert_not_equals assert_contains assert_file_exists assert_file_not_exists
export -f assert_dir_exists assert_exit_code mock_command unmock_command
export -f run_test run_all_tests print_test_summary setup_test_environment
export -f validate_script time_script

# Initialize if this script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    init_test_framework
fi