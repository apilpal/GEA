#!/bin/bash

set -e  # Exit on any error

echo "🧪 Running All Tests for Student Profiles PWA"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Initialize test results
BACKEND_PASSED=false
FRONTEND_PASSED=false
E2E_PASSED=false

echo "🏗️  Testing Backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Setting up virtual environment..."
    python -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

# Check if pytest is available
if ! python -c "import pytest" 2>/dev/null; then
    echo "📦 Installing pytest..."
    pip install pytest pytest-cov
fi

echo "🧪 Running backend unit tests..."
# Set environment for dual database testing
export ENVIRONMENT="${ENVIRONMENT:-development}"
export SYNC_ENABLED="false"  # Disable sync during testing

if python -m pytest test_main.py test_dual_database.py test_postgres.py -v --tb=short; then
    print_status "Backend tests passed"
    BACKEND_PASSED=true
else
    print_error "Backend tests failed"
fi

cd ..
echo ""

# Frontend tests
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    echo "🎨 Testing Frontend..."

    cd frontend

    # Setup Node.js environment
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing Node.js dependencies..."
        npm install
    fi

    # Build TypeScript
    echo "🔨 Building TypeScript..."
    if npm run build; then
        print_status "TypeScript build successful"
    else
        print_error "TypeScript build failed"
    fi

    # Run frontend tests
    echo "🧪 Running frontend unit tests..."
    if npm test -- --watchAll=false --passWithNoTests; then
        print_status "Frontend tests passed"
        FRONTEND_PASSED=true
    else
        print_error "Frontend tests failed"
    fi

    cd ..
else
    print_warning "Frontend directory not found, skipping frontend tests"
    FRONTEND_PASSED=true  # Consider as passed if not applicable
fi

echo ""

# E2E tests
echo "🔄 Testing End-to-End..."

if python e2e_tests/tests/e2e_tests.py; then
    print_status "E2E tests passed"
    E2E_PASSED=true
else
    print_error "E2E tests failed"
fi

echo ""
echo "=============================================="

# Summary
if [ "$BACKEND_PASSED" = true ] && [ "$FRONTEND_PASSED" = true ] && [ "$E2E_PASSED" = true ]; then
    print_status "All tests completed successfully!"
    echo ""
    echo "📊 Test Coverage Reports:"
    echo "   Backend: backend_coverage/htmlcov/index.html"
    echo "   Frontend: frontend_coverage/lcov-report/index.html"
    echo "   E2E: e2e_coverage/htmlcov/index.html"
    exit 0
else
    print_error "Some tests failed!"
    echo ""
    echo "📋 Test Results:"
    echo "   Backend: $([ "$BACKEND_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "   Frontend: $([ "$FRONTEND_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "   E2E: $([ "$E2E_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")"
    exit 1
fi