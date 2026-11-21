#!/bin/bash

# Student Profiles PWA Build Script
# This script builds both backend and frontend components
# Works from any directory with proper context detection

set -e  # Exit on any error

echo "🚀 Building Student Profiles PWA"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables for context
SCRIPT_DIR=""
PROJECT_ROOT=""
BACKEND_DIR=""
FRONTEND_DIR=""

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_debug() {
    echo -e "${BLUE}🔍 $1${NC}"
}

# Context debugging and validation functions
detect_project_context() {
    print_debug "Detecting project context..."

    # Get the directory where this script is located
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"

    # Find project root by looking for key project files
    PROJECT_ROOT="$SCRIPT_DIR"
    while [ ! -f "$PROJECT_ROOT/backend/main.py" ] && [ ! -f "$PROJECT_ROOT/frontend/package.json" ] && [ "$PROJECT_ROOT" != "/" ]; do
        PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
    done

    # Verify we found the project root
    if [ ! -f "$PROJECT_ROOT/backend/main.py" ] || [ ! -f "$PROJECT_ROOT/frontend/package.json" ]; then
        print_error "Could not locate project root directory"
        print_info "Script location: $SCRIPT_DIR"
        print_info "Current working directory: $(pwd)"
        print_info "Expected files: backend/main.py and frontend/package.json"
        return 1
    fi

    # Set absolute paths
    BACKEND_DIR="$PROJECT_ROOT/backend"
    FRONTEND_DIR="$PROJECT_ROOT/frontend"

    print_debug "Context detection completed:"
    print_debug "  Script directory: $SCRIPT_DIR"
    print_debug "  Project root: $PROJECT_ROOT"
    print_debug "  Backend directory: $BACKEND_DIR"
    print_debug "  Frontend directory: $FRONTEND_DIR"
    print_debug "  Execution context: $(pwd)"

    return 0
}

validate_context() {
    print_debug "Validating project context..."

    local errors=0

    # Check backend requirements
    if [ ! -f "$BACKEND_DIR/main.py" ]; then
        print_error "Backend main.py not found at: $BACKEND_DIR/main.py"
        ((errors++))
    fi

    if [ ! -f "$BACKEND_DIR/requirements.txt" ]; then
        print_error "Backend requirements.txt not found at: $BACKEND_DIR/requirements.txt"
        ((errors++))
    fi

    if [ ! -f "$BACKEND_DIR/build.py" ]; then
        print_error "Backend build.py not found at: $BACKEND_DIR/build.py"
        ((errors++))
    fi

    # Check frontend requirements
    if [ ! -f "$FRONTEND_DIR/package.json" ]; then
        print_error "Frontend package.json not found at: $FRONTEND_DIR/package.json"
        ((errors++))
    fi

    if [ ! -f "$FRONTEND_DIR/tsconfig.json" ]; then
        print_warning "Frontend tsconfig.json not found at: $FRONTEND_DIR/tsconfig.json"
    fi

    if [ $errors -gt 0 ]; then
        print_error "Context validation failed with $errors error(s)"
        return 1
    fi

    print_status "Context validation passed"
    return 0
}

get_execution_context() {
    # Detect the execution environment
    if [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ] || [ -n "$GITLAB_CI" ]; then
        echo "CI/CD"
    elif [ -n "$DOCKER_CONTAINER" ] || [ -f "/.dockerenv" ]; then
        echo "Docker"
    else
        echo "Local"
    fi
}

# Initialize project context
if ! detect_project_context; then
    print_error "Failed to detect project context"
    exit 1
fi

if ! validate_context; then
    print_error "Project context validation failed"
    exit 1
fi

# Display execution context information
EXECUTION_CONTEXT=$(get_execution_context)
print_info "Execution context: $EXECUTION_CONTEXT"

# Check for required scripts and make them executable if they exist
required_scripts=("run.sh" "test.sh")
for script in "${required_scripts[@]}"; do
    script_path="$PROJECT_ROOT/$script"
    if [ -f "$script_path" ]; then
        chmod +x "$script_path"
        print_debug "Made $script executable"
    else
        print_warning "Optional script $script not found at $script_path - some functionality may be limited"
    fi
done

# Backend build
echo ""
print_info "Building Backend..."
echo "-------------------"

cd "$BACKEND_DIR"

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    print_info "Creating virtual environment..."
    python -m venv .venv
fi

# Activate virtual environment (cross-platform compatible)
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
    print_debug "Activated Unix virtual environment"
elif [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate
    print_debug "Activated Windows virtual environment"
else
    print_warning "Virtual environment not found, Python packages may not be available"
fi

# Install/update dependencies
print_info "Installing backend dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    print_error "requirements.txt not found in $BACKEND_DIR"
    exit 1
fi

# Install Alembic for migrations
print_info "Installing Alembic..."
pip install alembic

# Build database schema
print_info "Setting up database..."
if [ -f "build.py" ]; then
    python build.py
else
    print_error "build.py not found in $BACKEND_DIR"
    exit 1
fi

backend_exit_code=$?
if [ $backend_exit_code -eq 0 ]; then
    print_status "Backend build completed"
else
    print_error "Backend build failed with exit code: $backend_exit_code"
    exit 1
fi

cd "$PROJECT_ROOT"

# Frontend build
echo ""
print_info "Building Frontend..."
echo "--------------------"

cd "$FRONTEND_DIR"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    print_info "Please install Node.js to build the frontend"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed or not in PATH"
    print_info "Please install npm to build the frontend"
    exit 1
fi

# Install dependencies
print_info "Installing frontend dependencies..."
if [ -f "package.json" ]; then
    npm install
else
    print_error "package.json not found in $FRONTEND_DIR"
    exit 1
fi

# Build the application
print_info "Building frontend application..."
npm run build

frontend_exit_code=$?
if [ $frontend_exit_code -eq 0 ]; then
    print_status "Frontend build completed"
else
    print_error "Frontend build failed with exit code: $frontend_exit_code"
    exit 1
fi

cd "$PROJECT_ROOT"

# Final status
echo ""
print_status "🎉 Build completed successfully!"
echo ""
print_info "Build Summary:"
print_info "  Project root: $PROJECT_ROOT"
print_info "  Execution context: $EXECUTION_CONTEXT"
print_info "  Backend built at: $BACKEND_DIR"
print_info "  Frontend built at: $FRONTEND_DIR"
echo ""
print_info "Next steps:"
echo "  1. Run '$PROJECT_ROOT/run.sh' to start the application"
echo "  2. Open http://127.0.0.1:5173 in your browser"
echo "  3. API documentation available at http://127.0.0.1:8000/docs"

# Make scripts executable (using absolute paths)
if [ -f "$PROJECT_ROOT/run.sh" ]; then
    chmod +x "$PROJECT_ROOT/run.sh"
fi

if [ -f "$PROJECT_ROOT/test.sh" ]; then
    chmod +x "$PROJECT_ROOT/test.sh"
fi

if [ -f "$BACKEND_DIR/build.py" ]; then
    chmod +x "$BACKEND_DIR/build.py"
fi

if [ -f "$BACKEND_DIR/migrate.py" ]; then
    chmod +x "$BACKEND_DIR/migrate.py"
fi

print_status "All scripts are now executable"

# Context information for troubleshooting
print_debug "Build completed in execution context: $EXECUTION_CONTEXT"
print_debug "Script location: $SCRIPT_DIR"
print_debug "Working directory: $(pwd)"