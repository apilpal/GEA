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

echo "🎨 Running Frontend Tests"
echo "========================="

# Navigate to frontend directory
if [ ! -d "frontend" ]; then
    print_error "Frontend directory not found"
    exit 1
fi

cd frontend
print_info "Working directory: $(pwd)"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_info "Node.js not found. Installing Node.js..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y nodejs npm
    elif command -v yum &> /dev/null; then
        sudo yum install -y nodejs npm
    else
        print_error "Unable to install Node.js automatically. Please install Node.js manually."
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
fi

print_info "Node.js version: $(node --version)"
print_info "NPM version: $(npm --version)"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
fi

# Build TypeScript
print_info "Building TypeScript..."
if npm run build; then
    print_status "TypeScript build successful"
else
    print_error "TypeScript build failed"
    exit 1
fi

# Clean up previous coverage reports
if [ -d "frontend_coverage" ]; then
    rm -rf frontend_coverage
fi

# Run tests with coverage
print_info "Running tests with coverage..."
if npm run test:coverage; then
    print_status "Frontend tests completed successfully"

    # Show test summary
    echo ""
    echo "📊 Test Summary:"
    echo "================"
    if [ -f "frontend_coverage/coverage-summary.json" ]; then
        # Extract coverage percentages from the JSON file
        COVERAGE=$(node -p "const fs = require('fs'); const coverage = JSON.parse(fs.readFileSync('frontend_coverage/coverage-summary.json', 'utf8')); const total = coverage.total; console.log('Lines: ' + total.lines.pct + '%'); console.log('Functions: ' + total.functions.pct + '%'); console.log('Branches: ' + total.branches.pct + '%'); console.log('Statements: ' + total.statements.pct + '%');" 2>/dev/null || echo "Coverage data unavailable")
        echo "$COVERAGE"
    fi

    echo ""
    print_info "Coverage report: frontend_coverage/lcov-report/index.html"

else
    print_error "Frontend tests failed"
    exit 1
fi

print_status "Frontend testing completed"