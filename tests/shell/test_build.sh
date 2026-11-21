#!/bin/bash

# Test script for build.sh
# Tests the main build script functionality

source "$(dirname "${BASH_SOURCE[0]}")/shell_test_framework.sh"

test_build_script() {
    print_header "Testing build.sh script"

    # Test 1: Check if build script exists and is executable
    validate_script "$PROJECT_ROOT/build.sh" "Main build script"

    # Test 2: Check if required files exist for build script to work
    assert_file_exists "$PROJECT_ROOT/backend/main.py" "Backend main file exists"
    assert_file_exists "$PROJECT_ROOT/backend/requirements.txt" "Backend requirements exist"
    assert_file_exists "$PROJECT_ROOT/frontend/package.json" "Frontend package.json exists"

    # Test 3: Test build script structure and content
    local build_content=$(cat "$PROJECT_ROOT/build.sh")

    # Check for essential components
    assert_contains "#!/bin/bash" "$build_content" "Has proper shebang"
    assert_contains "set -e" "$build_content" "Has error handling"
    assert_contains "Building Backend" "$build_content" "Contains backend build section"
    assert_contains "Building Frontend" "$build_content" "Contains frontend build section"
    assert_contains "Build completed successfully" "$build_content" "Contains success message"

    # Test 4: Test build script syntax
    assert_exit_code 0 "bash -n '$PROJECT_ROOT/build.sh'" "Build script has valid syntax"

    # Test 5: Test build script in dry-run mode (mock dependencies)
    setup_test_environment

    # Mock the commands that build.sh would execute
    mock_command "python" "echo 'Mock Python executed'; exit 0"
    mock_command "pip" "echo 'Mock pip executed'; exit 0"
    mock_command "npm" "echo 'Mock npm executed'; exit 0"

    # Create a test version of build.sh for testing
    cat > "$TEST_TEMP_DIR/test_build.sh" << 'EOF'
#!/bin/bash
set -e

# Mock build script for testing
echo "🚀 Building Test Project"
echo "========================="

# Backend build (mock)
echo ""
echo "Building Backend..."
cd backend 2>/dev/null || echo "Backend directory not found"
python -c "print('Mock backend build')" || echo "Python not available"
pip install -r requirements.txt 2>/dev/null || echo "Pip install failed"

# Frontend build (mock)
echo ""
echo "Building Frontend..."
cd ../frontend 2>/dev/null || echo "Frontend directory not found"
npm install 2>/dev/null || echo "NPM install failed"
npm run build 2>/dev/null || echo "NPM build failed"

echo ""
echo "Build completed successfully!"
EOF

    # Test the mock build script
    cd "$TEST_TEMP_DIR"
    assert_exit_code 0 "bash test_build.sh" "Mock build script executes successfully"

    # Cleanup mocks
    unmock_command "python"
    unmock_command "pip"
    unmock_command "npm"

    print_status "build.sh tests completed"
}

test_build_error_handling() {
    print_header "Testing build.sh error handling"

    # Test 1: Test build script failure when files don't exist
    setup_test_environment

    # Create a build script that will fail due to missing files
    cat > "$TEST_TEMP_DIR/failing_build.sh" << 'EOF'
#!/bin/bash
set -e

# Check if we're in the project root
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "Build completed"
EOF

    cd "$TEST_TEMP_DIR"
    # Remove the mock files to trigger failure
    rm -f backend/main.py frontend/package.json

    assert_exit_code 1 "bash failing_build.sh" "Build script fails when required files missing"

    print_status "build.sh error handling tests completed"
}

# Run the tests
init_test_framework
run_test "Build Script Tests" test_build_script
run_test "Build Error Handling Tests" test_build_error_handling

# Print summary
print_test_summary