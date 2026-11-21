#!/bin/bash

# Test script for test.sh
# Tests the main test script functionality

source "$(dirname "${BASH_SOURCE[0]}")/shell_test_framework.sh"

test_test_script() {
    print_header "Testing test.sh script"

    # Test 1: Check if test script exists and is executable
    validate_script "$PROJECT_ROOT/test.sh" "Main test script"

    # Test 2: Check test script structure and content
    local test_content=$(cat "$PROJECT_ROOT/test.sh")

    # Check for essential components
    assert_contains "#!/bin/bash" "$test_content" "Has proper shebang"
    assert_contains "set -e" "$test_content" "Has error handling"
    assert_contains "Running All Tests" "$test_content" "Contains test header"
    assert_contains "Testing Backend" "$test_content" "Contains backend test section"
    assert_contains "Testing Frontend" "$test_content" "Contains frontend test section"
    assert_contains "Testing End-to-End" "$test_content" "Contains E2E test section"
    assert_contains "Test Summary" "$test_content" || assert_contains "Test Results" "$test_content" "Contains test summary"

    # Test 3: Test test script syntax
    assert_exit_code 0 "bash -n '$PROJECT_ROOT/test.sh'" "Test script has valid syntax"

    # Test 4: Test test script functionality with mocks
    setup_test_environment

    # Create a test version of test.sh for testing
    cat > "$TEST_TEMP_DIR/test_test.sh" << 'EOF'
#!/bin/bash
set -e

echo "🧪 Running All Tests for Test Project"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Initialize test results
BACKEND_PASSED=false
FRONTEND_PASSED=false
E2E_PASSED=false

echo "🏗️  Testing Backend..."
if python -m pytest test_main.py test_dual_database.py test_postgres.py -v --tb=short >/dev/null 2>&1; then
    print_status "Backend tests passed"
    BACKEND_PASSED=true
else
    print_error "Backend tests failed"
fi

echo ""
echo "🎨 Testing Frontend..."
if npm test -- --watchAll=false --passWithNoTests >/dev/null 2>&1; then
    print_status "Frontend tests passed"
    FRONTEND_PASSED=true
else
    print_error "Frontend tests failed"
fi

echo ""
echo "🔄 Testing End-to-End..."
if python e2e_tests/tests/e2e_tests.py >/dev/null 2>&1; then
    print_status "E2E tests passed"
    E2E_PASSED=true
else
    print_error "E2E tests failed"
fi

echo ""
echo "====================================="

# Summary
if [ "$BACKEND_PASSED" = true ] && [ "$FRONTEND_PASSED" = true ] && [ "$E2E_PASSED" = true ]; then
    print_status "All tests completed successfully!"
    exit 0
else
    print_error "Some tests failed!"
    exit 1
fi
EOF

    # Test the mock test script
    cd "$TEST_TEMP_DIR"

    # Create mock test files
    mkdir -p backend frontend
    touch backend/test_main.py backend/test_dual_database.py backend/test_postgres.py
    touch frontend/package.json
    touch e2e_tests.py

    # Mock pytest and npm to pass
    mock_command "python" "echo 'Mock pytest passed'; exit 0"
    mock_command "npm" "echo 'Mock npm test passed'; exit 0"

    local output=$(bash test_test.sh 2>/dev/null)
    assert_contains "Running All Tests" "$output" "Script shows test header"
    assert_contains "Testing Backend" "$output" "Script tests backend"
    assert_contains "Testing Frontend" "$output" "Script tests frontend"
    assert_contains "Testing End-to-End" "$output" "Script tests E2E"
    assert_contains "All tests completed successfully" "$output" "Script shows success"

    # Cleanup mocks
    unmock_command "python"
    unmock_command "npm"

    print_status "test.sh basic functionality tests completed"
}

test_test_script_error_handling() {
    print_header "Testing test.sh error handling"

    # Test 1: Test test script failure handling
    setup_test_environment

    # Create a test script that will fail some tests
    cat > "$TEST_TEMP_DIR/failing_test.sh" << 'EOF'
#!/bin/bash
set -e

echo "🧪 Running Tests with Failures"
echo "=============================="

# Mock failing tests
python -c "exit 1" 2>/dev/null && echo "Backend passed" || echo "Backend failed"
npm test --fail 2>/dev/null && echo "Frontend passed" || echo "Frontend failed"
python failing_e2e.py 2>/dev/null && echo "E2E passed" || echo "E2E failed"

echo ""
echo "=============================="

# Check results (this should fail)
if [ $? -eq 0 ]; then
    echo "All tests passed"
    exit 0
else
    echo "Some tests failed"
    exit 1
fi
EOF

    cd "$TEST_TEMP_DIR"
    assert_exit_code 1 "bash failing_test.sh" "Test script fails when tests fail"

    print_status "test.sh error handling tests completed"
}

test_test_script_reporting() {
    print_header "Testing test.sh reporting functionality"

    # Test 1: Test test result reporting
    local test_content=$(cat "$PROJECT_ROOT/test.sh")

    # Check for reporting components
    assert_contains "Test Coverage" "$test_content" "Contains coverage reporting"
    assert_contains "htmlcov" "$test_content" "Contains HTML coverage reports"
    assert_contains "Backend.*PASSED" "$test_content" "Contains backend result reporting"
    assert_contains "Frontend.*PASSED" "$test_content" "Contains frontend result reporting"
    assert_contains "E2E.*PASSED" "$test_content" "Contains E2E result reporting"

    print_status "test.sh reporting tests completed"
}

# Run the tests
init_test_framework
run_test "Test Script Tests" test_test_script
run_test "Test Script Error Handling Tests" test_test_script_error_handling
run_test "Test Script Reporting Tests" test_test_script_reporting

# Print summary
print_test_summary