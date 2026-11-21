#!/bin/bash

# Enhanced Shell Scripts with Better Error Handling and Validation
# This script contains improved versions of existing shell scripts

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

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

# Enhanced build script with better error handling
create_enhanced_build_script() {
    print_header "Creating enhanced build script"

    cat > "build_enhanced.sh" << 'EOF'
#!/bin/bash

# Enhanced Student Profiles PWA Build Script
# Improved version with better error handling and validation

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
    echo -e "${BLUE}🚀 $1${NC}"
}

# Validation functions
validate_environment() {
    print_info "Validating build environment..."

    # Check if we're in the project root
    if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
        print_error "Please run this script from the project root directory"
        print_info "Expected files:"
        print_info "  - backend/main.py"
        print_info "  - frontend/package.json"
        exit 1
    fi

    # Check for required tools
    local required_tools=("python" "pip" "node" "npm")
    local missing_tools=()

    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            missing_tools+=("$tool")
        fi
    done

    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_info "Please install the missing tools and try again"
        exit 1
    fi

    print_status "Environment validation completed"
}

check_disk_space() {
    local required_space_mb=500
    local available_space

    case "$(uname)" in
        "Darwin")
            available_space=$(df "$(pwd)" | awk 'NR==2 {print int($4/1024)}')
            ;;
        "Linux")
            available_space=$(df "$(pwd)" | awk 'NR==2 {print int($4/1024)}')
            ;;
        *)
            print_warning "Cannot check disk space on this platform"
            return 0
            ;;
    esac

    if [ $available_space -lt $required_space_mb ]; then
        print_error "Insufficient disk space: ${available_space}MB available, ${required_space_mb}MB required"
        exit 1
    else
        print_status "Disk space check passed: ${available_space}MB available"
    fi
}

build_backend() {
    print_header "Building Backend"

    cd backend

    # Check Python version
    local python_version=$(python --version 2>&1 | awk '{print $2}')
    print_info "Python version: $python_version"

    # Create virtual environment if it doesn't exist
    if [ ! -d ".venv" ]; then
        print_info "Creating virtual environment..."
        python -m venv .venv
    fi

    # Activate virtual environment
    source .venv/bin/activate

    # Upgrade pip
    print_info "Upgrading pip..."
    pip install --upgrade pip

    # Install/update dependencies
    print_info "Installing backend dependencies..."
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    else
        print_error "requirements.txt not found"
        exit 1
    fi

    # Install development dependencies
    print_info "Installing development dependencies..."
    pip install black flake8 mypy pytest

    # Run code quality checks
    print_info "Running code quality checks..."
    python -m py_compile main.py || {
        print_error "Python syntax check failed"
        exit 1
    }

    # Install Alembic for migrations
    pip install alembic

    # Build database schema
    print_info "Setting up database..."
    if [ -f "build.py" ]; then
        python build.py
    else
        print_warning "build.py not found, skipping database setup"
    fi

    cd ..
    print_status "Backend build completed"
}

build_frontend() {
    print_header "Building Frontend"

    cd frontend

    # Check Node.js version
    local node_version=$(node --version)
    print_info "Node.js version: $node_version"

    # Install dependencies
    print_info "Installing frontend dependencies..."
    if [ -f "package.json" ]; then
        npm ci  # Use ci instead of install for more reliable builds
    else
        print_error "package.json not found"
        exit 1
    fi

    # Run linting
    print_info "Running code linting..."
    if command -v npm >/dev/null 2>&1; then
        npm run lint 2>/dev/null || print_warning "Linting not configured or failed"
    fi

    # Build the application
    print_info "Building frontend application..."
    npm run build

    cd ..
    print_status "Frontend build completed"
}

run_tests() {
    print_header "Running Tests"

    # Run shell script tests if available
    if [ -f "tests/shell/shell_test_framework.sh" ]; then
        print_info "Running shell script tests..."
        bash tests/shell/shell_test_framework.sh
    fi

    print_status "Tests completed"
}

main() {
    local start_time=$(date +%s)

    print_header "Enhanced Build Script Starting"
    echo "======================================"

    # Pre-build validation
    validate_environment
    check_disk_space

    # Main build process
    build_backend
    build_frontend
    run_tests

    # Post-build summary
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    print_status "🎉 Build completed successfully in ${duration}s!"
    echo ""
    print_info "Next steps:"
    echo "  1. Run './run.sh' to start the application"
    echo "  2. Open http://127.0.0.1:5173 in your browser"
    echo "  3. API documentation available at http://127.0.0.1:8000/docs"
    echo ""
    print_info "Build artifacts:"
    echo "  - Backend virtual environment: backend/.venv/"
    echo "  - Frontend build: frontend/dist/"
    echo "  - Node modules: frontend/node_modules/"

    # Make scripts executable
    chmod +x run.sh test.sh 2>/dev/null || true

    print_status "All scripts are now executable"
}

# Trap to ensure cleanup on error
trap 'print_error "Build failed! Check the logs above for details."' ERR

# Run main function
main "$@"
EOF

    chmod +x "build_enhanced.sh"
    print_status "Enhanced build script created: build_enhanced.sh"
}

# Enhanced run script with better error handling
create_enhanced_run_script() {
    print_header "Creating enhanced run script"

    cat > "run_enhanced.sh" << 'EOF'
#!/bin/bash

# Enhanced Student Profiles PWA Run Script
# Improved version with better error handling and process management

set -euo pipefail

# Function to cleanup processes on exit
cleanup() {
    echo ""
    print_info "Stopping servers..."

    if [ -n "${FRONTEND_PID:-}" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        print_info "Stopping frontend server (PID: $FRONTEND_PID)..."
        kill -TERM "$FRONTEND_PID" 2>/dev/null || true
        wait "$FRONTEND_PID" 2>/dev/null || true
    fi

    if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        print_info "Stopping backend server (PID: $BACKEND_PID)..."
        kill -TERM "$BACKEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" 2>/dev/null || true
    fi

    print_status "All servers stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Configuration
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
    echo -e "${BLUE}🚀 $1${NC}"
}

validate_ports() {
    print_info "Validating port availability..."

    # Check if ports are available
    if command -v netstat >/dev/null 2>&1; then
        if netstat -tuln 2>/dev/null | grep -q ":$BACKEND_PORT "; then
            print_error "Backend port $BACKEND_PORT is already in use"
            print_info "Please free the port or set BACKEND_PORT to a different value"
            exit 1
        fi

        if netstat -tuln 2>/dev/null | grep -q ":$FRONTEND_PORT "; then
            print_error "Frontend port $FRONTEND_PORT is already in use"
            print_info "Please free the port or set FRONTEND_PORT to a different value"
            exit 1
        fi
    fi

    print_status "Ports are available (Backend: $BACKEND_PORT, Frontend: $FRONTEND_PORT)"
}

check_dependencies() {
    print_info "Checking dependencies..."

    # Check backend dependencies
    if [ ! -f "backend/requirements.txt" ]; then
        print_error "Backend requirements.txt not found!"
        exit 1
    fi

    # Check if Python dependencies are installed
    cd backend
    if ! python -c "import fastapi, sqlalchemy, uvicorn" 2>/dev/null; then
        print_warning "Backend dependencies not installed"
        print_info "Installing backend dependencies..."
        pip install -r requirements.txt
    fi
    cd ..

    # Check frontend dependencies
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        cd frontend
        if [ ! -d "node_modules" ]; then
            print_warning "Frontend dependencies not installed"
            print_info "Installing frontend dependencies..."
            npm install
        fi
        cd ..
    else
        print_error "Frontend directory or package.json not found"
        exit 1
    fi

    print_status "Dependencies check completed"
}

start_backend() {
    print_header "Starting Backend Server"
    echo "Port: $BACKEND_PORT"
    echo "Host: $BACKEND_HOST"

    cd backend

    # Start the backend server in the background
    print_info "Starting uvicorn server..."
    uvicorn main:app --reload --host "$BACKEND_HOST" --port "$BACKEND_PORT" &
    BACKEND_PID=$!

    cd ..

    # Wait a moment for server to start
    sleep 2

    # Verify server started
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        print_status "Backend server started (PID: $BACKEND_PID)"
    else
        print_error "Backend server failed to start"
        exit 1
    fi
}

start_frontend() {
    print_header "Starting Frontend Server"
    echo "Port: $FRONTEND_PORT"
    echo "Host: $FRONTEND_HOST"

    cd frontend

    # Start the frontend server in the background
    print_info "Starting npm dev server..."
    npm run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" &
    FRONTEND_PID=$!

    cd ..

    # Wait a moment for server to start
    sleep 3

    # Verify server started
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        print_status "Frontend server started (PID: $FRONTEND_PID)"
    else
        print_error "Frontend server failed to start"
        exit 1
    fi
}

show_status() {
    echo ""
    print_status "✅ Servers started successfully!"
    echo "=========================================="
    echo "📊 Backend API:     http://$BACKEND_HOST:$BACKEND_PORT"
    echo "🎨 Frontend PWA:    http://$FRONTEND_HOST:$FRONTEND_PORT"
    echo "📚 API Docs:        http://$BACKEND_HOST:$BACKEND_PORT/docs"
    echo "=========================================="
    echo "💡 Health Check:"
    echo "   Backend: curl http://$BACKEND_HOST:$BACKEND_PORT/health"
    echo "   Frontend: curl http://$FRONTEND_HOST:$FRONTEND_PORT"
    echo ""
    print_info "Press Ctrl+C to stop all servers"
    echo ""
}

main() {
    print_header "Enhanced Application Startup"
    echo "=============================="

    # Pre-flight checks
    validate_ports
    check_dependencies

    # Start servers
    start_backend
    start_frontend

    # Show status and wait
    show_status

    # Wait for the servers
    wait $BACKEND_PID $FRONTEND_PID
}

# Run main function
main "$@"
EOF

    chmod +x "run_enhanced.sh"
    print_status "Enhanced run script created: run_enhanced.sh"
}

# Enhanced test script with better error handling
create_enhanced_test_script() {
    print_header "Creating enhanced test script"

    cat > "test_enhanced.sh" << 'EOF'
#!/bin/bash

# Enhanced Test Script
# Improved version with better error handling and reporting

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
    echo -e "${BLUE}🧪 $1${NC}"
}

# Test result tracking
TEST_RESULTS_FILE="/tmp/test_results_$$.json"
declare -A TEST_STATUS=(
    ["backend"]="NOT_RUN"
    ["frontend"]="NOT_RUN"
    ["e2e"]="NOT_RUN"
    ["shell"]="NOT_RUN"
)

update_test_status() {
    local test_type="$1"
    local status="$2"
    TEST_STATUS[$test_type]="$status"

    # Update results file
    cat > "$TEST_RESULTS_FILE" << EOF
{
    "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
    "test_results": {
        "backend": "${TEST_STATUS[backend]}",
        "frontend": "${TEST_STATUS[frontend]}",
        "e2e": "${TEST_STATUS[e2e]}",
        "shell": "${TEST_STATUS[shell]}"
    }
}
EOF
}

run_backend_tests() {
    print_header "Running Backend Tests"

    cd backend

    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        print_info "Creating virtual environment..."
        python -m venv venv
    fi

    source venv/bin/activate

    # Install dependencies
    print_info "Installing backend dependencies..."
    pip install -r requirements.txt

    # Install test dependencies
    print_info "Installing test dependencies..."
    pip install pytest pytest-cov pytest-asyncio

    # Set environment for testing
    export ENVIRONMENT="${ENVIRONMENT:-test}"
    export SYNC_ENABLED="false"

    # Clean previous coverage reports
    rm -rf ../backend_coverage

    # Run tests with coverage
    print_info "Running backend tests with coverage..."
    if python -m pytest test_main.py test_dual_database.py test_postgres.py -v \
        --tb=short \
        --cov=. \
        --cov-report=html:../backend_coverage \
        --cov-report=xml:../backend_coverage.xml \
        --cov-report=term; then

        print_status "Backend tests passed"
        update_test_status "backend" "PASSED"

        # Show coverage summary
        echo ""
        print_info "Coverage Summary:"
        python -m pytest test_main.py test_dual_database.py test_postgres.py \
            --cov=. --cov-report=term --quiet | grep -E "(TOTAL|backend)" | tail -1

    else
        print_error "Backend tests failed"
        update_test_status "backend" "FAILED"
        return 1
    fi

    deactivate
    cd ..
}

run_frontend_tests() {
    print_header "Running Frontend Tests"

    if [ ! -d "frontend" ] || [ ! -f "frontend/package.json" ]; then
        print_warning "Frontend directory not found, skipping frontend tests"
        update_test_status "frontend" "SKIPPED"
        return 0
    fi

    cd frontend

    # Install dependencies
    if [ ! -d "node_modules" ]; then
        print_info "Installing Node.js dependencies..."
        npm ci
    fi

    # Build TypeScript
    print_info "Building TypeScript..."
    if ! npm run build; then
        print_error "TypeScript build failed"
        update_test_status "frontend" "FAILED"
        return 1
    fi

    print_status "TypeScript build successful"

    # Run frontend tests
    print_info "Running frontend tests..."
    if npm test -- --watchAll=false --passWithNoTests --coverage; then
        print_status "Frontend tests passed"
        update_test_status "frontend" "PASSED"
    else
        print_error "Frontend tests failed"
        update_test_status "frontend" "FAILED"
        return 1
    fi

    cd ..
}

run_e2e_tests() {
    print_header "Running End-to-End Tests"

    if [ -f "e2e_tests/tests/e2e_tests.py" ]; then
        print_info "Running E2E tests..."
        if python e2e_tests/tests/e2e_tests.py; then
            print_status "E2E tests passed"
            update_test_status "e2e" "PASSED"
        else
            print_error "E2E tests failed"
            update_test_status "e2e" "FAILED"
            return 1
        fi
    else
        print_warning "E2E tests not found, skipping"
        update_test_status "e2e" "SKIPPED"
    fi
}

run_shell_tests() {
    print_header "Running Shell Script Tests"

    if [ -f "tests/shell/shell_test_framework.sh" ]; then
        print_info "Running shell script tests..."
        if bash tests/shell/shell_test_framework.sh; then
            print_status "Shell script tests passed"
            update_test_status "shell" "PASSED"
        else
            print_warning "Shell script tests had failures"
            update_test_status "shell" "FAILED"
        fi
    else
        print_warning "Shell test framework not found, skipping"
        update_test_status "shell" "SKIPPED"
    fi
}

generate_test_report() {
    print_header "Test Execution Report"
    echo "======================"

    echo "Test Results Summary:"
    echo "  Backend:  ${TEST_STATUS[backend]}"
    echo "  Frontend: ${TEST_STATUS[frontend]}"
    echo "  E2E:      ${TEST_STATUS[e2e]}"
    echo "  Shell:    ${TEST_STATUS[shell]}"
    echo ""

    # Count results
    local passed=0
    local failed=0
    local skipped=0

    for status in "${TEST_STATUS[@]}"; do
        case "$status" in
            "PASSED") ((passed++)) ;;
            "FAILED") ((failed++)) ;;
            "SKIPPED") ((skipped++)) ;;
        esac
    done

    echo "Summary:"
    echo "  Passed:  $passed"
    echo "  Failed:  $failed"
    echo "  Skipped: $skipped"
    echo "  Total:   $((passed + failed + skipped))"
    echo ""

    if [ $failed -eq 0 ]; then
        print_status "All executed tests passed! 🎉"
        echo ""
        print_info "Coverage Reports:"
        [ -d "backend_coverage" ] && echo "  Backend: backend_coverage/htmlcov/index.html"
        [ -d "frontend/coverage" ] && echo "  Frontend: frontend/coverage/lcov-report/index.html"
        return 0
    else
        print_error "Some tests failed! ❌"
        echo ""
        print_info "Check the output above for detailed error information"
        return 1
    fi
}

main() {
    local start_time=$(date +%s)

    print_header "Enhanced Test Suite"
    echo "==================="

    # Create results file
    update_test_status "init" "STARTED"

    # Run all test suites
    run_backend_tests
    run_frontend_tests
    run_e2e_tests
    run_shell_tests

    # Generate final report
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    print_info "Total test execution time: ${duration}s"
    echo ""

    generate_test_report

    # Cleanup
    rm -f "$TEST_RESULTS_FILE"
}

# Trap for cleanup
trap 'rm -f "$TEST_RESULTS_FILE"' EXIT

# Run main function
main "$@"
EOF

    chmod +x "test_enhanced.sh"
    print_status "Enhanced test script created: test_enhanced.sh"
}

# Main function to create all enhanced scripts
main() {
    print_header "Creating Enhanced Shell Scripts"
    echo "==============================="

    create_enhanced_build_script
    create_enhanced_run_script
    create_enhanced_test_script

    echo ""
    print_status "All enhanced scripts created successfully!"
    echo ""
    print_info "Enhanced scripts available:"
    echo "  - build_enhanced.sh (improved build script)"
    echo "  - run_enhanced.sh (improved run script)"
    echo "  - test_enhanced.sh (improved test script)"
    echo ""
    print_info "Original scripts are preserved and can be used as before"
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi