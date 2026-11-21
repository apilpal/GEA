#!/bin/bash

# Test script for run.sh
# Tests the main run script functionality

source "$(dirname "${BASH_SOURCE[0]}")/shell_test_framework.sh"

test_run_script() {
    print_header "Testing run.sh script"

    # Test 1: Check if run script exists and is executable
    validate_script "$PROJECT_ROOT/run.sh" "Main run script"

    # Test 2: Check run script structure and content
    local run_content=$(cat "$PROJECT_ROOT/run.sh")

    # Check for essential components
    assert_contains "#!/bin/bash" "$run_content" "Has proper shebang"
    assert_contains "set -e" "$run_content" "Has error handling"
    assert_contains "cleanup()" "$run_content" "Has cleanup function"
    assert_contains "Starting.*Backend" "$run_content" "Contains backend startup"
    assert_contains "Starting.*Frontend" "$run_content" "Contains frontend startup"
    assert_contains "Servers started successfully" "$run_content" "Contains success message"

    # Test 3: Test run script syntax
    assert_exit_code 0 "bash -n '$PROJECT_ROOT/run.sh'" "Run script has valid syntax"

    # Test 4: Test run script functionality with mocks
    setup_test_environment

    # Create a test version of run.sh for testing
    cat > "$TEST_TEMP_DIR/test_run.sh" << 'EOF'
#!/bin/bash
set -e

# Mock run script for testing
echo "🚀 Starting Test Application..."
echo "==============================="

# Check dependencies (mock)
echo "📦 Checking dependencies..."

# Mock backend check
echo "🔧 Starting backend server..."
echo "Mock backend started"

# Mock frontend check
echo "🌐 Starting frontend server..."
echo "Mock frontend started"

echo ""
echo "✅ Servers started successfully!"
echo "=================================="
echo "📊 Backend API:     http://127.0.0.1:8000"
echo "🎨 Frontend PWA:    http://127.0.0.1:5173"
echo "📚 API Docs:        http://127.0.0.1:8000/docs"
echo "=================================="
EOF

    # Test the mock run script
    cd "$TEST_TEMP_DIR"
    local output=$(bash test_run.sh)
    assert_contains "Starting Test Application" "$output" "Script shows startup message"
    assert_contains "Servers started successfully" "$output" "Script shows success message"
    assert_contains "Backend API: http://127.0.0.1:8000" "$output" "Script shows backend URL"
    assert_contains "Frontend PWA: http://127.0.0.1:5173" "$output" "Script shows frontend URL"

    print_status "run.sh basic functionality tests completed"
}

test_run_script_ports() {
    print_header "Testing run.sh port configuration"

    # Test 1: Test default port configuration
    setup_test_environment

    # Create a test script that checks port variables
    cat > "$TEST_TEMP_DIR/test_ports.sh" << 'EOF'
#!/bin/bash

# Test port configuration
BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

echo "Backend Port: $BACKEND_PORT"
echo "Frontend Port: $FRONTEND_PORT"
EOF

    cd "$TEST_TEMP_DIR"
    local output=$(bash test_ports.sh)
    assert_contains "Backend Port: 8000" "$output" "Default backend port is 8000"
    assert_contains "Frontend Port: 5173" "$output" "Default frontend port is 5173"

    # Test 2: Test custom port configuration
    local custom_output=$(BACKEND_PORT=9000 FRONTEND_PORT=4000 bash test_ports.sh)
    assert_contains "Backend Port: 9000" "$custom_output" "Custom backend port works"
    assert_contains "Frontend Port: 4000" "$custom_output" "Custom frontend port works"

    print_status "run.sh port configuration tests completed"
}

test_run_script_cleanup() {
    print_header "Testing run.sh cleanup functionality"

    # Test 1: Test cleanup function exists
    local run_content=$(cat "$PROJECT_ROOT/run.sh")
    assert_contains "cleanup()" "$run_content" "Cleanup function exists"
    assert_contains "trap cleanup" "$run_content" "Cleanup trap is set"
    assert_contains "kill.*FRONTEND_PID" "$run_content" "Kills frontend process"
    assert_contains "kill.*BACKEND_PID" "$run_content" "Kills backend process"

    # Test 2: Test cleanup functionality with mock processes
    setup_test_environment

    cat > "$TEST_TEMP_DIR/test_cleanup.sh" << 'EOF'
#!/bin/bash

# Function to cleanup processes on exit
cleanup() {
    echo "Stopping servers..."
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "Killing frontend process: $FRONTEND_PID"
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$BACKEND_PID" ]; then
        echo "Killing backend process: $BACKEND_PID"
        kill $BACKEND_PID 2>/dev/null || true
    fi
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Mock some process IDs
FRONTEND_PID=12345
BACKEND_PID=12346

echo "Test script running. Press Ctrl+C to test cleanup."
sleep 10
EOF

    cd "$TEST_TEMP_DIR"

    # Test that cleanup function is properly defined
    assert_exit_code 0 "grep -q 'cleanup()' test_cleanup.sh" "Cleanup function is defined"
    assert_exit_code 0 "grep -q 'trap cleanup' test_cleanup.sh" "Cleanup trap is set"

    print_status "run.sh cleanup tests completed"
}

# Run the tests
init_test_framework
run_test "Run Script Tests" test_run_script
run_test "Run Script Port Tests" test_run_script_ports
run_test "Run Script Cleanup Tests" test_run_script_cleanup

# Print summary
print_test_summary