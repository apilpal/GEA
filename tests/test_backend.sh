#!/bin/bash

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🧪 Running Backend Tests"
echo "========================"

# Navigate to backend directory
if [ ! -d "backend" ]; then
    print_error "Backend directory not found"
    exit 1
fi

cd backend
print_info "Working directory: $(pwd)"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_info "Creating virtual environment..."
    python -m venv venv
fi

print_info "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
print_info "Installing dependencies..."
pip install -r requirements.txt

# Check if pytest is available
if ! python -c "import pytest" 2>/dev/null; then
    print_info "Installing pytest and coverage tools..."
    pip install pytest pytest-cov
fi

# Clean up previous coverage reports
if [ -d "../backend_coverage" ]; then
    rm -rf ../backend_coverage
fi

# Set environment for dual database testing
export ENVIRONMENT="${ENVIRONMENT:-development}"
export SYNC_ENABLED="false"  # Disable sync during testing

# Run tests with coverage
print_info "Running tests with coverage..."
if python -m pytest test_main.py test_dual_database.py test_postgres.py -v --tb=short --cov=. --cov-report=html:../backend_coverage --cov-report=term --cov-report=xml:../backend_coverage.xml; then
    print_status "Backend tests completed successfully"

    # Show coverage summary
    echo ""
    echo "📊 Coverage Summary:"
    echo "==================="
    python -m pytest test_main.py test_dual_database.py test_postgres.py --cov=. --cov-report=term --quiet | grep -E "(TOTAL|backend)" | tail -1

    echo ""
    print_info "Coverage reports generated:"
    echo "  HTML Report: ../backend_coverage/htmlcov/index.html"
    echo "  XML Report:  ../backend_coverage.xml"

else
    print_error "Backend tests failed"
    deactivate
    exit 1
fi

deactivate
print_status "Backend testing completed"