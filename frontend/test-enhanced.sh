#!/bin/bash

# Enhanced Testing Script
# Provides comprehensive testing with reporting and analysis

set -e

echo "🧪 Enhanced Testing Framework"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the frontend directory."
    exit 1
fi

# Function to run tests with coverage
run_tests() {
    print_status "Running test suite with coverage..."
    npm run test:coverage

    if [ $? -eq 0 ]; then
        print_success "Tests completed successfully"
    else
        print_warning "Some tests failed, but continuing with reporting..."
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    npm run test:integration

    if [ $? -eq 0 ]; then
        print_success "Integration tests completed successfully"
    else
        print_warning "Some integration tests failed"
    fi
}

# Function to generate test report
generate_report() {
    print_status "Generating comprehensive test report..."

    # Create reports directory if it doesn't exist
    mkdir -p ../test-reports

    # Generate the report using our custom reporter
    node -e "
        import('./src/test-reporters.ts').then(async (m) => {
            const { TestReporter, CoverageAnalyzer, TestPerformanceAnalyzer } = m;

            const reporter = new TestReporter();
            const coverageAnalyzer = new CoverageAnalyzer();
            const performanceAnalyzer = new TestPerformanceAnalyzer();

            try {
                const reportPath = await reporter.generateAndSaveReport();
                console.log('📊 Test report saved to:', reportPath);

                const coverage = await coverageAnalyzer.analyzeCoverage();
                console.log('🎯 Coverage Analysis:', coverage);

                const performance = await performanceAnalyzer.analyzePerformance();
                console.log('⚡ Performance Analysis:', performance);

                process.exit(0);
            } catch (error) {
                console.error('❌ Error generating report:', error.message);
                process.exit(1);
            }
        }).catch((error) => {
            console.error('❌ Failed to load test reporters:', error.message);
            process.exit(1);
        });
    "

    if [ $? -eq 0 ]; then
        print_success "Test report generated successfully"
    else
        print_error "Failed to generate test report"
    fi
}

# Function to enforce coverage thresholds
enforce_coverage() {
    print_status "Enforcing coverage thresholds..."

    node -e "
        import('./src/test-reporters.ts').then(async (m) => {
            const { CoverageThresholdEnforcer } = m;
            const enforcer = new CoverageThresholdEnforcer({
                statements: 80,
                branches: 75,
                functions: 80,
                lines: 80
            });

            const result = await enforcer.enforceThresholds();

            if (result.passed) {
                console.log('✅ All coverage thresholds met!');
                process.exit(0);
            } else {
                console.log('❌ Coverage thresholds not met');
                result.results.forEach(r => {
                    if (!r.passed) {
                        console.log(\`  ❌ \${r.type}: \${r.actual}% < \${r.threshold}%\`);
                    }
                });
                process.exit(1);
            }
        });
    "
}

# Function to analyze test performance
analyze_performance() {
    print_status "Analyzing test performance..."

    node -e "
        import('./src/test-reporters.ts').then(async (m) => {
            const { TestPerformanceAnalyzer } = m;
            const analyzer = new TestPerformanceAnalyzer();

            const performance = await analyzer.analyzePerformance();

            console.log('📊 Performance Analysis Results:');
            console.log('Average Duration:', (performance.averageDuration / 1000).toFixed(2), 'seconds');

            if (performance.slowestTests.length > 0) {
                console.log('\\n🐌 Slowest Tests:');
                performance.slowestTests.forEach(test => {
                    console.log(\`  • \${test.name}: \${(test.duration / 1000).toFixed(2)}s\`);
                });
            }

            if (performance.fastestTests.length > 0) {
                console.log('\\n🚀 Fastest Tests:');
                performance.fastestTests.forEach(test => {
                    console.log(\`  • \${test.name}: \${test.duration}ms\`);
                });
            }

            if (performance.recommendations.length > 0) {
                console.log('\\n💡 Performance Recommendations:');
                performance.recommendations.forEach(rec => {
                    console.log(\`  • \${rec}\`);
                });
            }

            process.exit(0);
        });
    "
}

# Function to open coverage report
open_coverage_report() {
    if [ -d "../frontend_coverage" ]; then
        print_status "Opening coverage report in browser..."

        if command -v xdg-open > /dev/null; then
            xdg-open "../frontend_coverage/lcov-report/index.html"
        elif command -v open > /dev/null; then
            open "../frontend_coverage/lcov-report/index.html"
        else
            print_warning "Could not open browser automatically. Open ../frontend_coverage/lcov-report/index.html manually."
        fi
    else
        print_warning "Coverage report not found. Run tests with coverage first."
    fi
}

# Function to show test statistics
show_stats() {
    print_status "Test Statistics Summary:"
    echo

    if [ -f "../frontend_coverage/coverage-summary.json" ]; then
        node -e "
            const coverage = JSON.parse(require('fs').readFileSync('../frontend_coverage/coverage-summary.json', 'utf8'));
            const total = coverage.total;

            console.log('📊 Coverage Summary:');
            console.log(\`  Statements: \${Math.round(total.statements.pct)}%\`);
            console.log(\`  Branches: \${Math.round(total.branches.pct)}%\`);
            console.log(\`  Functions: \${Math.round(total.functions.pct)}%\`);
            console.log(\`  Lines: \${Math.round(total.lines.pct)}%\`);
            console.log();

            const fileCount = Object.keys(coverage).length - 1; // Exclude 'total'
            console.log(\`📁 Analyzed \${fileCount} files\`);
        "
    fi

    if [ -f "../test-reports/test-report-$(date +%Y-%m-%d).md" ]; then
        print_status "Latest test report available at: ../test-reports/test-report-$(date +%Y-%m-%d).md"
    fi
}

# Main execution
case "${1:-all}" in
    "unit")
        print_status "Running unit tests..."
        run_tests
        ;;
    "integration")
        print_status "Running integration tests..."
        run_integration_tests
        ;;
    "coverage")
        print_status "Running tests with coverage..."
        run_tests
        open_coverage_report
        ;;
    "report")
        print_status "Generating test report..."
        generate_report
        ;;
    "enforce")
        print_status "Enforcing coverage thresholds..."
        enforce_coverage
        ;;
    "performance")
        print_status "Analyzing test performance..."
        analyze_performance
        ;;
    "analyze")
        print_status "Running comprehensive analysis..."
        run_tests
        generate_report
        analyze_performance
        show_stats
        ;;
    "open")
        open_coverage_report
        ;;
    "stats")
        show_stats
        ;;
    "all")
        print_status "Running complete test suite..."
        run_tests
        run_integration_tests
        generate_report
        analyze_performance
        show_stats
        print_success "Complete test suite finished!"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [COMMAND]"
        echo
        echo "Commands:"
        echo "  unit         - Run unit tests only"
        echo "  integration  - Run integration tests only"
        echo "  coverage     - Run tests with coverage and open report"
        echo "  report       - Generate comprehensive test report"
        echo "  enforce      - Enforce coverage thresholds (fails if below threshold)"
        echo "  performance  - Analyze test performance"
        echo "  analyze      - Run full analysis (tests + report + performance)"
        echo "  open         - Open coverage report in browser"
        echo "  stats        - Show test statistics summary"
        echo "  all          - Run complete test suite (default)"
        echo "  help         - Show this help message"
        echo
        echo "Examples:"
        echo "  $0 coverage    # Run tests with coverage and open report"
        echo "  $0 analyze     # Run comprehensive analysis"
        echo "  $0 enforce     # Check if coverage meets thresholds"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' to see available commands."
        exit 1
        ;;
esac

echo
print_success "Testing framework execution completed!"